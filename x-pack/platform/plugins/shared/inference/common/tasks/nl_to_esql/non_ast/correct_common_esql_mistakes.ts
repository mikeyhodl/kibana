/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scalarFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/scalar_functions';
import { groupingFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/grouping_functions';
import { aggFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/aggregation_functions';
import { timeSeriesAggFunctionDefinitions } from '@kbn/esql-ast/src/definitions/generated/time_series_agg_functions';
import type { FunctionDefinition } from '@kbn/esql-ast';
import { memoize } from 'lodash';

const STRING_DELIMITER_TOKENS = ['`', "'", '"'];
const ESCAPE_TOKEN = '\\\\';

// this function splits statements by a certain token,
// and takes into account escaping, or function calls

function split(value: string, splitToken: string) {
  const statements: string[] = [];

  let delimiterToken: string | undefined;

  let groupingCount: number = 0;

  let currentStatement: string = '';

  const trimmed = value.trim().split('');

  for (let index = 0; index < trimmed.length; index++) {
    const char = trimmed[index];

    if (
      !delimiterToken &&
      groupingCount === 0 &&
      trimmed
        .slice(index, index + splitToken.length)
        .join('')
        .toLowerCase() === splitToken.toLowerCase()
    ) {
      index += splitToken.length - 1;
      statements.push(currentStatement.trim());
      currentStatement = '';
      continue;
    }

    currentStatement += char;

    if (delimiterToken === char) {
      // end identifier
      delimiterToken = undefined;
    } else if (!delimiterToken && trimmed[index - 1] !== ESCAPE_TOKEN) {
      const applicableToken = STRING_DELIMITER_TOKENS.includes(char) ? char : undefined;

      if (applicableToken) {
        // start identifier
        delimiterToken = applicableToken;
        continue;
      } else if (char === '(') {
        groupingCount++;
      } else if (char === ')') {
        groupingCount--;
      }
    }
  }

  if (currentStatement) {
    statements.push(currentStatement.trim());
  }

  return statements;
}

export function splitIntoCommands(query: string) {
  const commands: string[] = split(query, '|');

  return commands.map((command) => {
    const commandName = command.match(/^([A-Za-z]+)/)?.[1];

    return {
      name: commandName,
      command,
    };
  });
}

function replaceSingleQuotesWithDoubleQuotes(command: string) {
  const regex = /'(?=(?:[^"]*"[^"]*")*[^"]*$)/g;
  return command.replace(regex, '"');
}

function removeColumnQuotesAndEscape(column: string) {
  const plainColumnIdentifier = column.replaceAll(/^"(.*)"$/g, `$1`).replaceAll(/^'(.*)'$/g, `$1`);

  if (isValidColumnName(plainColumnIdentifier)) {
    return plainColumnIdentifier;
  }

  return '`' + plainColumnIdentifier + '`';
}

const getFunctionDefinitionMap = memoize(() => {
  const functionDefinitionMap = new Map<string, FunctionDefinition>();
  const allFunctionDefinitions = [
    ...scalarFunctionDefinitions,
    ...aggFunctionDefinitions,
    ...timeSeriesAggFunctionDefinitions,
    ...groupingFunctionDefinitions,
  ];
  allFunctionDefinitions.forEach((definition) => {
    const functionName = definition.name.toLowerCase();
    if (!functionDefinitionMap.has(functionName)) {
      functionDefinitionMap.set(functionName, definition);
    }
  });
  return functionDefinitionMap;
});

/**
 * Replaces quotes for fields in function argument if present.
 * @example
 * Example 1: Without quotes
 * escapeColumnsInFunctions('MIN(total_bytes)'); // 'MIN(total_bytes)'
 *
 * @example
 * Example 2: With quotes
 * escapeColumnsInFunctions('MIN("Total Bytes")'); // 'MIN(`Total Bytes`)'
 */
function escapeColumnsInFunctions(string: string): string {
  const regex = /([A-Za-z_]+)\s*\(([^()]*?)\)/g;

  return string.replace(regex, (match: string, functionName: string, args: string) => {
    const functionDefinition = getFunctionDefinitionMap().get(functionName.toLowerCase());
    if (!functionDefinition) {
      // function definition not found, return the original match
      return match;
    }

    const escapedArgs = args.length
      ? args
          .split(',')
          .map((arg, index) => {
            const trimmedArg = arg.trim();
            // Only escape field names
            const paramName = functionDefinition.signatures[0].params[index]?.name;
            if (paramName !== 'field' && paramName !== 'number') {
              // It should be just a field, but some functions like SUM and AVG have a "number" name 🤷‍♂️
              return trimmedArg;
            }
            // If the string is not wrapped in quotes, return it as is
            if (!trimmedArg.match(/^["'].*["']$/)) {
              return trimmedArg;
            }
            return removeColumnQuotesAndEscape(trimmedArg);
          })
          .join(', ')
      : args;

    return `${functionName}(${escapedArgs})`;
  });
}

function replaceAsKeywordWithAssignments(command: string) {
  return command.replaceAll(/^STATS\s*(.*)/g, (__, statsOperations: string) => {
    return `STATS ${statsOperations.replaceAll(
      /(,\s*)?(.*?)\s(AS|as)\s([`a-zA-Z0-9.\-_]+)/g,
      '$1$4 = $2'
    )}`;
  });
}

function isValidColumnName(column: string) {
  return Boolean(column.match(/^`.*`$/) || column.match(/^[@A-Za-z\._\-\d]+$/));
}

function escapeColumns(line: string) {
  const [, command, body] = line.match(/^([A-Za-z_]+)(.*)$/ms) ?? ['', '', ''];

  const escapedBody = split(body.trim(), ',')
    .map((statement) => {
      const [lhs, rhs] = split(statement, '=');

      if (!rhs) {
        return lhs;
      }
      const escapedRhs = escapeColumnsInFunctions(rhs);
      return `${removeColumnQuotesAndEscape(lhs)} = ${escapedRhs}`;
    })
    .join(', ');

  return `${command} ${escapedBody}`;
}

function verifyKeepColumns(
  keepCommand: string,
  nextCommands: Array<{ name?: string; command: string }>
) {
  const columnsInKeep = split(keepCommand.replace(/^KEEP\s*/, ''), ',').map((statement) =>
    split(statement, '=')?.[0].trim()
  );

  const availableColumns = columnsInKeep.concat();

  for (const { name, command } of nextCommands) {
    if (['STATS', 'KEEP', 'DROP', 'DISSECT', 'GROK', 'ENRICH', 'RENAME'].includes(name || '')) {
      // these operations alter columns in a way that is hard to analyze, so we abort
      break;
    }

    const commandBody = command.replace(/^[A-Za-z]+\s*/, '');

    if (name === 'EVAL') {
      // EVAL creates new columns, make them available
      const columnsInEval = split(commandBody, ',').map((column) =>
        split(column.trim(), '=')[0].trim()
      );

      columnsInEval.forEach((column) => {
        availableColumns.push(column);
      });
    }

    if (name === 'RENAME') {
      // RENAME creates and removes columns
      split(commandBody, ',').forEach((statement) => {
        const [prevName, newName] = split(statement, 'AS').map((side) => side.trim());
        availableColumns.push(newName);
        if (!availableColumns.includes(prevName)) {
          columnsInKeep.push(prevName);
        }
      });
    }

    if (name === 'SORT') {
      const columnsInSort = split(commandBody, ',').map((column) =>
        split(column.trim(), ' ')[0].trim()
      );

      columnsInSort.forEach((column) => {
        if (isValidColumnName(column) && !availableColumns.includes(column)) {
          columnsInKeep.push(column);
        }
      });
    }
  }

  return `KEEP ${columnsInKeep.join(', ')}`;
}

function escapeExpressionsInSort(sortCommand: string) {
  const columnsInSort = split(sortCommand.replace(/^SORT\s*/, ''), ',')
    .map((statement) => split(statement, '=')?.[0].trim())
    .map((columnAndSortOrder) => {
      let [, column, sortOrder = ''] =
        columnAndSortOrder.match(/^(.*?)\s+(ASC|DESC\s*([A-Z\s]+)?)?$/i) || [];
      if (!column) {
        return columnAndSortOrder;
      }

      if (sortOrder) sortOrder = ` ${sortOrder}`;

      if (!column.match(/^`.*?`$/) && !column.match(/^[a-zA-Z0-9_\.@]+$/)) {
        column = `\`${column}\``;
      }

      return `${column}${sortOrder}`;
    });

  return `SORT ${columnsInSort.join(', ')}`;
}

function ensureEqualityOperators(whereCommand: string) {
  const body = whereCommand.split(/^WHERE /)[1];

  const byChar = body.split('');

  let next = '';
  let isColumnName = false;
  byChar.forEach((char, index) => {
    next += char;

    if (!isColumnName && char === '=' && byChar[index - 1] === ' ' && byChar[index + 1] === ' ') {
      next += '=';
    }

    if (!isColumnName && (char === '`' || char.match(/[a-z@]/i))) {
      isColumnName = true;
    } else if (isColumnName && (char === '`' || !char.match(/[a-z@0-9]/i))) {
      isColumnName = false;
    }
  });

  return `WHERE ${next}`;
}

export function correctCommonEsqlMistakes(query: string): {
  isCorrection: boolean;
  input: string;
  output: string;
} {
  const commands = splitIntoCommands(query.trim());

  const formattedCommands: string[] = commands.map(({ name, command }, index) => {
    let formattedCommand = command;

    formattedCommand = formattedCommand
      .replaceAll(/"@timestamp"/g, '@timestamp')
      .replaceAll(/'@timestamp'/g, '@timestamp');

    switch (name) {
      case 'FROM': {
        formattedCommand = split(formattedCommand, ',')
          .map((singlePattern) => singlePattern.replaceAll(/`/g, '"').replaceAll(/'/g, '"'))
          .join(',');
        break;
      }
      case 'WHERE':
        formattedCommand = replaceSingleQuotesWithDoubleQuotes(formattedCommand);
        formattedCommand = ensureEqualityOperators(formattedCommand);
        break;

      case 'EVAL':
        formattedCommand = replaceSingleQuotesWithDoubleQuotes(formattedCommand);
        formattedCommand = escapeColumns(formattedCommand);
        break;

      case 'STATS':
        formattedCommand = replaceAsKeywordWithAssignments(formattedCommand);
        const [before, after] = split(formattedCommand, ' BY ');
        formattedCommand = escapeColumns(before);
        if (after) {
          formattedCommand += ` BY ${after}`;
        }
        break;

      case 'KEEP':
        formattedCommand = verifyKeepColumns(formattedCommand, commands.slice(index + 1));
        break;

      case 'SORT':
        formattedCommand = escapeExpressionsInSort(formattedCommand);
        break;
    }
    return formattedCommand;
  });

  const output = formattedCommands.join('\n| ');

  const originalFormattedQuery = commands.map((cmd) => cmd.command).join('\n| ');

  const isCorrection = output !== originalFormattedQuery;

  return {
    input: query,
    output,
    isCorrection,
  };
}
