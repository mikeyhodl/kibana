/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EntryExists,
  EntryList,
  EntryMatch,
  EntryMatchAny,
  EntryNested,
  ListOperatorEnum as OperatorEnum,
  ListOperatorTypeEnum as OperatorTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  ALL_OPERATORS,
  BuilderEntry,
  DETECTION_ENGINE_EXCEPTION_OPERATORS,
  EXCEPTION_OPERATORS_SANS_LISTS,
  EmptyEntry,
  ExceptionsBuilderExceptionItem,
  ExceptionsBuilderReturnExceptionItem,
  FormattedBuilderEntry,
  OperatorOption,
  doesNotExistOperator,
  doesNotMatchOperator,
  existsOperator,
  filterExceptionItems,
  getCorrespondingKeywordField,
  getEntryFromOperator,
  getEntryOnFieldChange,
  getEntryOnListChange,
  getEntryOnMatchAnyChange,
  getEntryOnMatchChange,
  getEntryOnOperatorChange,
  getEntryValue,
  getExceptionOperatorSelect,
  getFilteredIndexPatterns,
  getFormattedBuilderEntries,
  getFormattedBuilderEntry,
  getNewExceptionItem,
  getOperatorOptions,
  getOperatorType,
  getUpdatedEntriesOnDelete,
  isEntryNested,
  isInListOperator,
  isNotInListOperator,
  isNotOneOfOperator,
  isNotOperator,
  isOneOfOperator,
  isOperator,
  matchesOperator,
} from '@kbn/securitysolution-list-utils';
import { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import { fields, getField } from '@kbn/data-plugin/common/mocks';
import type { FieldSpec } from '@kbn/data-plugin/common';

import { ENTRIES_WITH_IDS } from '../../../../common/constants.mock';
import { getEntryExistsMock } from '../../../../common/schemas/types/entry_exists.mock';
import { getExceptionListItemSchemaMock } from '../../../../common/schemas/response/exception_list_item_schema.mock';
import { getEntryNestedMock } from '../../../../common/schemas/types/entry_nested.mock';
import { getEntryMatchMock } from '../../../../common/schemas/types/entry_match.mock';
import { getEntryMatchAnyMock } from '../../../../common/schemas/types/entry_match_any.mock';
import { getListResponseMock } from '../../../../common/schemas/response/list_schema.mock';
import { getEntryListMock } from '../../../../common/schemas/types/entry_list.mock';

// TODO: ALL THESE TESTS SHOULD BE MOVED TO @kbn/securitysolution-list-utils for its helper. The only reason why they're here is due to missing other packages we hae to create or missing things from kbn packages such as mocks from kibana core

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('123'),
}));

const getEntryExistsWithIdMock = (): EntryExists & { id: string } => ({
  ...getEntryExistsMock(),
  id: '123',
});

const getEntryNestedWithIdMock = (): EntryNested & { id: string } => ({
  ...getEntryNestedMock(),
  id: '123',
});

const getEntryMatchWithIdMock = (): EntryMatch & { id: string } => ({
  ...getEntryMatchMock(),
  id: '123',
});

const getEntryMatchAnyWithIdMock = (): EntryMatchAny & { id: string } => ({
  ...getEntryMatchAnyMock(),
  id: '123',
});

const getMockIndexPattern = (): DataViewBase => ({
  fields,
  id: '1234',
  title: 'logstash-*',
});

const getMockBuilderEntry = (): FormattedBuilderEntry => ({
  correspondingKeywordField: undefined,
  entryIndex: 0,
  field: getField('ip'),
  id: '123',
  nested: undefined,
  operator: isOperator,
  parent: undefined,
  value: 'some value',
});

const getMockNestedBuilderEntry = (): FormattedBuilderEntry => ({
  correspondingKeywordField: undefined,
  entryIndex: 0,
  field: getField('nestedField.child'),
  id: '123',
  nested: 'child',
  operator: isOperator,
  parent: {
    parent: {
      ...getEntryNestedWithIdMock(),
      entries: [{ ...getEntryMatchWithIdMock(), field: 'child' }],
      field: 'nestedField',
    },
    parentIndex: 0,
  },
  value: 'some value',
});

const getMockNestedParentBuilderEntry = (): FormattedBuilderEntry => ({
  correspondingKeywordField: undefined,
  entryIndex: 0,
  field: {
    ...getField('nestedField.child'),
    esTypes: ['nested'],
    name: 'nestedField',
  } as FieldSpec,
  id: '123',
  nested: 'parent',
  operator: isOperator,
  parent: undefined,
  value: undefined,
});

const mockEndpointFields = [
  {
    aggregatable: false,
    count: 0,
    esTypes: ['keyword'],
    name: 'file.path.caseless',
    readFromDocValues: false,
    scripted: false,
    searchable: true,
    type: 'string',
  },
  {
    aggregatable: false,
    count: 0,
    esTypes: ['text'],
    name: 'file.Ext.code_signature.status',
    readFromDocValues: false,
    scripted: false,
    searchable: true,
    subType: { nested: { path: 'file.Ext.code_signature' } },
    type: 'string',
  },
];

export const getEndpointField = (name: string): DataViewFieldBase =>
  mockEndpointFields.find((field) => field.name === name) as DataViewFieldBase;

describe('Exception builder helpers', () => {
  describe('#getFilteredIndexPatterns', () => {
    describe('list type detections', () => {
      test('it returns nested fields that match parent value when "item.nested" is "child"', () => {
        const payloadIndexPattern = getMockIndexPattern();
        const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem);
        const expected: DataViewBase = {
          fields: [{ ...getField('nestedField.child'), name: 'child' }],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });

      test('it returns only parent nested field when "item.nested" is "parent" and nested parent field is not undefined', () => {
        const payloadIndexPattern = getMockIndexPattern();
        const payloadItem: FormattedBuilderEntry = getMockNestedParentBuilderEntry();
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem);
        const expected: DataViewBase & { fields: Array<Partial<FieldSpec>> } = {
          fields: [{ ...getField('nestedField.child'), esTypes: ['nested'], name: 'nestedField' }],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });

      test('it returns only nested fields when "item.nested" is "parent" and nested parent field is undefined', () => {
        const payloadIndexPattern = getMockIndexPattern();
        const payloadItem: FormattedBuilderEntry = {
          ...getMockNestedParentBuilderEntry(),
          field: undefined,
        };
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem);
        const expected: DataViewBase = {
          fields: [
            { ...getField('nestedField.child') },
            { ...getField('nestedField.nestedChild.doublyNestedChild') },
          ],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });

      test('it returns all fields unfiltered if "item.nested" is not "child" or "parent"', () => {
        const payloadIndexPattern = getMockIndexPattern();
        const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem);
        const expected: DataViewBase = {
          fields: [...fields],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });
    });

    describe('list type endpoint', () => {
      let payloadIndexPattern = getMockIndexPattern();

      beforeAll(() => {
        payloadIndexPattern = {
          ...payloadIndexPattern,
          fields: [...payloadIndexPattern.fields, ...mockEndpointFields],
        };
      });

      test('it returns nested fields that match parent value when "item.nested" is "child"', () => {
        const payloadItem: FormattedBuilderEntry = {
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: getEndpointField('file.Ext.code_signature.status'),
          id: '123',
          nested: 'child',
          operator: isOperator,
          parent: {
            parent: {
              ...getEntryNestedWithIdMock(),
              entries: [{ ...getEntryMatchWithIdMock(), field: 'child' }],
              field: 'file.Ext.code_signature',
            },
            parentIndex: 0,
          },
          value: 'some value',
        };
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem);
        const expected: DataViewBase = {
          fields: [{ ...getEndpointField('file.Ext.code_signature.status'), name: 'status' }],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });

      test('it returns only parent nested field when "item.nested" is "parent" and nested parent field is not undefined', () => {
        const field: FieldSpec = {
          ...getEndpointField('file.Ext.code_signature.status'),
          esTypes: ['nested'],
          name: 'file.Ext.code_signature',
        } as FieldSpec;
        const payloadItem: FormattedBuilderEntry = {
          ...getMockNestedParentBuilderEntry(),
          field,
        };
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem);
        const fieldsExpected: FieldSpec[] = [
          {
            aggregatable: false,
            count: 0,
            esTypes: ['nested'],
            name: 'file.Ext.code_signature',
            readFromDocValues: false,
            scripted: false,
            searchable: true,
            subType: {
              nested: {
                path: 'file.Ext.code_signature',
              },
            },
            type: 'string',
          },
        ];
        const expected: DataViewBase = {
          fields: fieldsExpected,
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });

      test('it returns only nested fields when "item.nested" is "parent" and nested parent field is undefined', () => {
        const payloadItem: FormattedBuilderEntry = {
          ...getMockNestedParentBuilderEntry(),
          field: undefined,
        };
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem);
        const expected: DataViewBase = {
          fields: [
            { ...getField('nestedField.child') },
            { ...getField('nestedField.nestedChild.doublyNestedChild') },
            getEndpointField('file.Ext.code_signature.status'),
          ],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });
    });
  });

  describe('#getEntryFromOperator', () => {
    test('it returns current value when switching from "is" to "is not"', () => {
      const payloadOperator: OperatorOption = isNotOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        value: 'I should stay the same',
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: EntryMatch & { id?: string } = {
        field: 'ip',
        id: '123',
        operator: 'excluded',
        type: OperatorTypeEnum.MATCH,
        value: 'I should stay the same',
      };
      expect(output).toEqual(expected);
    });

    test('it returns current value when switching from "is not" to "is"', () => {
      const payloadOperator: OperatorOption = isOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isNotOperator,
        value: 'I should stay the same',
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: EntryMatch & { id?: string } = {
        field: 'ip',
        id: '123',
        operator: OperatorEnum.INCLUDED,
        type: OperatorTypeEnum.MATCH,
        value: 'I should stay the same',
      };
      expect(output).toEqual(expected);
    });

    test('it returns empty value when switching operator types to "match"', () => {
      const payloadOperator: OperatorOption = isOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isNotOneOfOperator,
        value: ['I should stay the same'],
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: EntryMatch & { id?: string } = {
        field: 'ip',
        id: '123',
        operator: OperatorEnum.INCLUDED,
        type: OperatorTypeEnum.MATCH,
        value: '',
      };
      expect(output).toEqual(expected);
    });

    test('it returns current value when switching from "is one of" to "is not one of"', () => {
      const payloadOperator: OperatorOption = isNotOneOfOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOneOfOperator,
        value: ['I should stay the same'],
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: EntryMatchAny & { id?: string } = {
        field: 'ip',
        id: '123',
        operator: 'excluded',
        type: OperatorTypeEnum.MATCH_ANY,
        value: ['I should stay the same'],
      };
      expect(output).toEqual(expected);
    });

    test('it returns current value when switching from "is not one of" to "is one of"', () => {
      const payloadOperator: OperatorOption = isOneOfOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isNotOneOfOperator,
        value: ['I should stay the same'],
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: EntryMatchAny & { id?: string } = {
        field: 'ip',
        id: '123',
        operator: OperatorEnum.INCLUDED,
        type: OperatorTypeEnum.MATCH_ANY,
        value: ['I should stay the same'],
      };
      expect(output).toEqual(expected);
    });

    test('it returns empty value when switching operator types to "match_any"', () => {
      const payloadOperator: OperatorOption = isOneOfOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOperator,
        value: 'I should stay the same',
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: EntryMatchAny & { id?: string } = {
        field: 'ip',
        id: '123',
        operator: OperatorEnum.INCLUDED,
        type: OperatorTypeEnum.MATCH_ANY,
        value: [],
      };
      expect(output).toEqual(expected);
    });

    test('it returns current value when switching from "exists" to "does not exist"', () => {
      const payloadOperator: OperatorOption = doesNotExistOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: existsOperator,
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: EntryExists & { id?: string } = {
        field: 'ip',
        id: '123',
        operator: 'excluded',
        type: 'exists',
      };
      expect(output).toEqual(expected);
    });

    test('it returns current value when switching from "does not exist" to "exists"', () => {
      const payloadOperator: OperatorOption = existsOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: doesNotExistOperator,
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: EntryExists & { id?: string } = {
        field: 'ip',
        id: '123',
        operator: OperatorEnum.INCLUDED,
        type: 'exists',
      };
      expect(output).toEqual(expected);
    });

    test('it returns empty value when switching operator types to "exists"', () => {
      const payloadOperator: OperatorOption = existsOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOperator,
        value: 'I should stay the same',
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: EntryExists & { id?: string } = {
        field: 'ip',
        id: '123',
        operator: OperatorEnum.INCLUDED,
        type: 'exists',
      };
      expect(output).toEqual(expected);
    });

    test('it returns empty value when switching operator types to "list"', () => {
      const payloadOperator: OperatorOption = isInListOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOperator,
        value: 'I should stay the same',
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: EntryList & { id?: string } = {
        field: 'ip',
        id: '123',
        list: { id: '', type: 'ip' },
        operator: OperatorEnum.INCLUDED,
        type: 'list',
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getOperatorOptions', () => {
    test('it returns "isOperator" when field type is nested but field itself has not yet been selected', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedParentBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'endpoint', false);
      const expected: OperatorOption[] = [isOperator];
      expect(output).toEqual(expected);
    });

    test('it returns "isOperator" if no field selected', () => {
      const payloadItem: FormattedBuilderEntry = { ...getMockBuilderEntry(), field: undefined };
      const output = getOperatorOptions(payloadItem, 'endpoint', false);
      const expected: OperatorOption[] = [isOperator];
      expect(output).toEqual(expected);
    });

    describe('"endpoint" list type', () => {
      test('it returns operators "is", "isOneOf", "matches" and "doesNotMatch" if item is nested and field supports "matches"', () => {
        const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
        const output = getOperatorOptions(payloadItem, 'endpoint', false);
        const expected: OperatorOption[] = [
          isOperator,
          isOneOfOperator,
          matchesOperator,
          doesNotMatchOperator,
        ];
        expect(output).toEqual(expected);
      });

      test('it returns operators "is" and "isOneOf" if item is nested and field does not support "matches"', () => {
        const payloadItem: FormattedBuilderEntry = {
          ...getMockNestedBuilderEntry(),
          field: getField('ip'),
        };
        const output = getOperatorOptions(payloadItem, 'endpoint', false);
        const expected: OperatorOption[] = [isOperator, isOneOfOperator];
        expect(output).toEqual(expected);
      });

      test('it returns operators "is", "isOneOf", "matches" and "doesNotMatch" if field supports "matches"', () => {
        const payloadItem: FormattedBuilderEntry = {
          ...getMockBuilderEntry(),
          field: getField('@tags'),
        };
        const output = getOperatorOptions(payloadItem, 'endpoint', false);
        const expected: OperatorOption[] = [
          isOperator,
          isOneOfOperator,
          matchesOperator,
          doesNotMatchOperator,
        ];
        expect(output).toEqual(expected);
      });

      test('it returns "isOperator" and "isOneOfOperator" if field does not support "matches"', () => {
        const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
        const output = getOperatorOptions(payloadItem, 'endpoint', false);
        const expected: OperatorOption[] = [isOperator, isOneOfOperator];
        expect(output).toEqual(expected);
      });

      test('it returns "isOperator" and field type is boolean', () => {
        const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
        const output = getOperatorOptions(payloadItem, 'endpoint', true);
        const expected: OperatorOption[] = [isOperator];
        expect(output).toEqual(expected);
      });
    });

    test('it returns "isOperator", "isOneOfOperator", and "existsOperator" if item is nested and "listType" is "detection"', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'detection', false);
      const expected: OperatorOption[] = [isOperator, isOneOfOperator, existsOperator];
      expect(output).toEqual(expected);
    });

    test('it returns "isOperator" and "existsOperator" if item is nested, "listType" is "detection", and field type is boolean', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'detection', true);
      const expected: OperatorOption[] = [isOperator, existsOperator];
      expect(output).toEqual(expected);
    });

    test('it returns "isOperator", "isNotOperator", "doesNotExistOperator" and "existsOperator" if field type is boolean', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'detection', true);
      const expected: OperatorOption[] = [
        isOperator,
        isNotOperator,
        existsOperator,
        doesNotExistOperator,
      ];
      expect(output).toEqual(expected);
    });

    test('it returns list operators if specified to', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'detection', false, true);
      expect(output.some((operator) => operator.value === 'is_not_in_list')).toBeTruthy();
      expect(output.some((operator) => operator.value === 'is_in_list')).toBeTruthy();
    });

    test('it does not return list operators if specified not to', () => {
      const payloadItem: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        field: getField('@tags'),
      };
      const output = getOperatorOptions(payloadItem, 'detection', false, false);
      expect(output).toEqual(EXCEPTION_OPERATORS_SANS_LISTS);
    });

    test('it returns all possible operators if list type is not "detection"', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'endpoint_events', false, true);
      expect(output).toEqual(ALL_OPERATORS);
    });

    test('it returns all operators supported by detection engine if list type is "detection"', () => {
      const payloadItem: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        field: getField('@tags'),
      };
      const output = getOperatorOptions(payloadItem, 'detection', false, true);
      expect(output).toEqual(DETECTION_ENGINE_EXCEPTION_OPERATORS);
    });

    test('it excludes wildcard operators if list type is "detection" and field is not a string', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'detection', false, true);
      const expected: OperatorOption[] = [
        isOperator,
        isNotOperator,
        isOneOfOperator,
        isNotOneOfOperator,
        existsOperator,
        doesNotExistOperator,
        isInListOperator,
        isNotInListOperator,
      ];
      expect(output).toEqual(expected);
    });
  });

  describe('#getEntryOnFieldChange', () => {
    test('it returns nested entry with single new subentry when "item.nested" is "parent"', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedParentBuilderEntry();
      const payloadIFieldType = getField('nestedField.child');
      const output = getEntryOnFieldChange(payloadItem, payloadIFieldType);
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: 'child',
              id: '123',
              operator: OperatorEnum.INCLUDED,
              type: OperatorTypeEnum.MATCH,
              value: '',
            },
          ],
          field: 'nestedField',
          id: '123',
          type: OperatorTypeEnum.NESTED,
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns nested entry with newly selected field value when "item.nested" is "child"', () => {
      const payloadItem: FormattedBuilderEntry = {
        ...getMockNestedBuilderEntry(),
        parent: {
          parent: {
            ...getEntryNestedWithIdMock(),
            entries: [
              { ...getEntryMatchWithIdMock(), field: 'child' },
              getEntryMatchAnyWithIdMock(),
            ],
            field: 'nestedField',
          },
          parentIndex: 0,
        },
      };
      const payloadIFieldType = getField('nestedField.child');
      const output = getEntryOnFieldChange(payloadItem, payloadIFieldType);
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: 'child',
              id: '123',
              operator: OperatorEnum.INCLUDED,
              type: OperatorTypeEnum.MATCH,
              value: '',
            },
            getEntryMatchAnyWithIdMock(),
          ],
          field: 'nestedField',
          id: '123',
          type: OperatorTypeEnum.NESTED,
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns field of type "match" with updated field if not a nested entry', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const payloadIFieldType = getField('ip');
      const output = getEntryOnFieldChange(payloadItem, payloadIFieldType);
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          field: 'ip',
          id: '123',
          operator: OperatorEnum.INCLUDED,
          type: OperatorTypeEnum.MATCH,
          value: '',
        },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getEntryOnOperatorChange', () => {
    test('it returns updated subentry preserving its value when entry is not switching operator types', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const payloadOperator: OperatorOption = isNotOperator;
      const output = getEntryOnOperatorChange(payloadItem, payloadOperator);
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          field: 'ip',
          id: '123',
          operator: 'excluded',
          type: OperatorTypeEnum.MATCH,
          value: 'some value',
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns updated subentry resetting its value when entry is switching operator types', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const payloadOperator: OperatorOption = isOneOfOperator;
      const output = getEntryOnOperatorChange(payloadItem, payloadOperator);
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          field: 'ip',
          id: '123',
          operator: OperatorEnum.INCLUDED,
          type: OperatorTypeEnum.MATCH_ANY,
          value: [],
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns updated subentry preserving its value when entry is nested and not switching operator types', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
      const payloadOperator: OperatorOption = isNotOperator;
      const output = getEntryOnOperatorChange(payloadItem, payloadOperator);
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: 'child',
              id: '123',
              operator: OperatorEnum.EXCLUDED,
              type: OperatorTypeEnum.MATCH,
              value: 'some value',
            },
          ],
          field: 'nestedField',
          id: '123',
          type: OperatorTypeEnum.NESTED,
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns updated subentry resetting its value when entry is nested and switching operator types', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
      const payloadOperator: OperatorOption = isOneOfOperator;
      const output = getEntryOnOperatorChange(payloadItem, payloadOperator);
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: 'child',
              id: '123',
              operator: OperatorEnum.INCLUDED,
              type: OperatorTypeEnum.MATCH_ANY,
              value: [],
            },
          ],
          field: 'nestedField',
          id: '123',
          type: OperatorTypeEnum.NESTED,
        },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getEntryOnMatchChange', () => {
    test('it returns entry with updated value', () => {
      const payload: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getEntryOnMatchChange(payload, 'jibber jabber');
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          field: 'ip',
          id: '123',
          operator: OperatorEnum.INCLUDED,
          type: OperatorTypeEnum.MATCH,
          value: 'jibber jabber',
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns entry with updated value and "field" of empty string if entry does not have a "field" defined', () => {
      const payload: FormattedBuilderEntry = { ...getMockBuilderEntry(), field: undefined };
      const output = getEntryOnMatchChange(payload, 'jibber jabber');
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          field: '',
          id: '123',
          operator: OperatorEnum.INCLUDED,
          type: OperatorTypeEnum.MATCH,
          value: 'jibber jabber',
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns nested entry with updated value', () => {
      const payload: FormattedBuilderEntry = getMockNestedBuilderEntry();
      const output = getEntryOnMatchChange(payload, 'jibber jabber');
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: 'child',
              id: '123',
              operator: OperatorEnum.INCLUDED,
              type: OperatorTypeEnum.MATCH,
              value: 'jibber jabber',
            },
          ],
          field: 'nestedField',
          id: '123',
          type: OperatorTypeEnum.NESTED,
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns nested entry with updated value and "field" of empty string if entry does not have a "field" defined', () => {
      const payload: FormattedBuilderEntry = { ...getMockNestedBuilderEntry(), field: undefined };
      const output = getEntryOnMatchChange(payload, 'jibber jabber');
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: '',
              id: '123',
              operator: OperatorEnum.INCLUDED,
              type: OperatorTypeEnum.MATCH,
              value: 'jibber jabber',
            },
          ],
          field: 'nestedField',
          id: '123',
          type: OperatorTypeEnum.NESTED,
        },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getEntryOnMatchAnyChange', () => {
    test('it returns entry with updated value', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOneOfOperator,
        value: ['some value'],
      };
      const output = getEntryOnMatchAnyChange(payload, ['jibber jabber']);
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          field: 'ip',
          id: '123',
          operator: OperatorEnum.INCLUDED,
          type: OperatorTypeEnum.MATCH_ANY,
          value: ['jibber jabber'],
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns entry with updated value and "field" of empty string if entry does not have a "field" defined', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        field: undefined,
        operator: isOneOfOperator,
        value: ['some value'],
      };
      const output = getEntryOnMatchAnyChange(payload, ['jibber jabber']);
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          field: '',
          id: '123',
          operator: OperatorEnum.INCLUDED,
          type: OperatorTypeEnum.MATCH_ANY,
          value: ['jibber jabber'],
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns nested entry with updated value', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockNestedBuilderEntry(),
        parent: {
          parent: {
            ...getEntryNestedWithIdMock(),
            entries: [{ ...getEntryMatchAnyWithIdMock(), field: 'child' }],
            field: 'nestedField',
          },
          parentIndex: 0,
        },
      };
      const output = getEntryOnMatchAnyChange(payload, ['jibber jabber']);
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: 'child',
              id: '123',
              operator: OperatorEnum.INCLUDED,
              type: OperatorTypeEnum.MATCH_ANY,
              value: ['jibber jabber'],
            },
          ],
          field: 'nestedField',
          id: '123',
          type: OperatorTypeEnum.NESTED,
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns nested entry with updated value and "field" of empty string if entry does not have a "field" defined', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockNestedBuilderEntry(),
        field: undefined,
        parent: {
          parent: {
            ...getEntryNestedWithIdMock(),
            entries: [{ ...getEntryMatchAnyWithIdMock(), field: 'child' }],
            field: 'nestedField',
          },
          parentIndex: 0,
        },
      };
      const output = getEntryOnMatchAnyChange(payload, ['jibber jabber']);
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: '',
              id: '123',
              operator: OperatorEnum.INCLUDED,
              type: OperatorTypeEnum.MATCH_ANY,
              value: ['jibber jabber'],
            },
          ],
          field: 'nestedField',
          id: '123',
          type: OperatorTypeEnum.NESTED,
        },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getEntryOnListChange', () => {
    test('it returns entry with updated value', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOneOfOperator,
        value: '1234',
      };
      const output = getEntryOnListChange(payload, getListResponseMock());
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          field: 'ip',
          id: '123',
          list: { id: 'some-list-id', type: 'ip' },
          operator: OperatorEnum.INCLUDED,
          type: 'list',
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns entry with updated value and "field" of empty string if entry does not have a "field" defined', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        field: undefined,
        operator: isOneOfOperator,
        value: '1234',
      };
      const output = getEntryOnListChange(payload, getListResponseMock());
      const expected: { updatedEntry: BuilderEntry & { id?: string }; index: number } = {
        index: 0,
        updatedEntry: {
          field: '',
          id: '123',
          list: { id: 'some-list-id', type: 'ip' },
          operator: OperatorEnum.INCLUDED,
          type: 'list',
        },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getFormattedBuilderEntries', () => {
    test('it returns formatted entry with field undefined if it unable to find a matching index pattern field and "allowCustomFieldOptions" is "false"', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const payloadItems: BuilderEntry[] = [getEntryMatchWithIdMock()];
      const output = getFormattedBuilderEntries(payloadIndexPattern, payloadItems, false);
      const expected: FormattedBuilderEntry[] = [
        {
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: undefined,
          id: '123',
          nested: undefined,
          operator: isOperator,
          parent: undefined,
          value: 'some host name',
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns formatted entry with field even if it is unable to find a matching index pattern field and "allowCustomFieldOptions" is "true"', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const payloadItems: BuilderEntry[] = [getEntryMatchWithIdMock()];
      const output = getFormattedBuilderEntries(payloadIndexPattern, payloadItems, true);
      const expected: FormattedBuilderEntry[] = [
        {
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: {
            name: 'host.name',
            type: 'keyword',
          },
          id: '123',
          nested: undefined,
          operator: isOperator,
          parent: undefined,
          value: 'some host name',
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns formatted entries when no nested entries exist', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const payloadItems: BuilderEntry[] = [
        { ...getEntryMatchWithIdMock(), field: 'ip', value: 'some ip' },
        { ...getEntryMatchAnyWithIdMock(), field: 'extension', value: ['some extension'] },
      ];
      const output = getFormattedBuilderEntries(payloadIndexPattern, payloadItems, false);
      const field1: FieldSpec = {
        aggregatable: true,
        count: 0,
        esTypes: ['ip'],
        name: 'ip',
        readFromDocValues: true,
        scripted: false,
        searchable: true,
        type: 'ip',
      };
      const field2: FieldSpec = {
        aggregatable: true,
        count: 0,
        esTypes: ['keyword'],
        name: 'extension',
        readFromDocValues: true,
        scripted: false,
        searchable: true,
        type: 'string',
      };
      const expected: FormattedBuilderEntry[] = [
        {
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: field1,
          id: '123',
          nested: undefined,
          operator: isOperator,
          parent: undefined,
          value: 'some ip',
        },
        {
          correspondingKeywordField: undefined,
          entryIndex: 1,
          field: field2,
          id: '123',
          nested: undefined,
          operator: isOneOfOperator,
          parent: undefined,
          value: ['some extension'],
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns formatted entries when nested entries exist', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const payloadParent: EntryNested = {
        ...getEntryNestedWithIdMock(),
        entries: [{ ...getEntryMatchWithIdMock(), field: 'child' }],
        field: 'nestedField',
      };
      const payloadItems: BuilderEntry[] = [
        { ...getEntryMatchWithIdMock(), field: 'ip', value: 'some ip' },
        { ...payloadParent },
      ];

      const output = getFormattedBuilderEntries(payloadIndexPattern, payloadItems, false);
      const field1: FieldSpec = {
        aggregatable: true,
        count: 0,
        esTypes: ['ip'],
        name: 'ip',
        readFromDocValues: true,
        scripted: false,
        searchable: true,
        type: 'ip',
      };
      const field2: FieldSpec = {
        aggregatable: false,
        esTypes: ['nested'],
        name: 'nestedField',
        searchable: false,
        type: 'string',
      };
      const field3: FieldSpec = {
        aggregatable: false,
        count: 0,
        esTypes: ['text'],
        name: 'child',
        readFromDocValues: false,
        scripted: false,
        searchable: true,
        subType: {
          nested: {
            path: 'nestedField',
          },
        },
        type: 'string',
      };
      const expected: FormattedBuilderEntry[] = [
        {
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: field1,
          id: '123',
          nested: undefined,
          operator: isOperator,
          parent: undefined,
          value: 'some ip',
        },
        {
          correspondingKeywordField: undefined,
          entryIndex: 1,
          field: field2,
          id: '123',
          nested: 'parent',
          operator: isOperator,
          parent: undefined,
          value: undefined,
        },
        {
          correspondingKeywordField: undefined,
          entryIndex: 0,
          field: field3,
          id: '123',
          nested: 'child',
          operator: isOperator,
          parent: {
            parent: {
              entries: [
                {
                  field: 'child',
                  id: '123',
                  operator: OperatorEnum.INCLUDED,
                  type: OperatorTypeEnum.MATCH,
                  value: 'some host name',
                },
              ],
              field: 'nestedField',
              id: '123',
              type: OperatorTypeEnum.NESTED,
            },
            parentIndex: 1,
          },
          value: 'some host name',
        },
      ];
      expect(output).toEqual(expected);
    });
  });

  describe('#getUpdatedEntriesOnDelete', () => {
    test('it removes entry corresponding to "entryIndex"', () => {
      const payloadItem: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: ENTRIES_WITH_IDS,
      };
      const output = getUpdatedEntriesOnDelete(payloadItem, 0, null);
      const expected: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            id: '123',
            operator: OperatorEnum.INCLUDED,
            type: OperatorTypeEnum.MATCH,
            value: 'some value',
          },
        ],
      };
      expect(output).toEqual(expected);
    });

    test('it removes nested entry of "entryIndex" with corresponding parent index', () => {
      const payloadItem: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            ...getEntryNestedWithIdMock(),
            entries: [{ ...getEntryExistsWithIdMock() }, { ...getEntryMatchAnyWithIdMock() }],
          },
        ],
      };
      const output = getUpdatedEntriesOnDelete(payloadItem, 0, 0);
      const expected: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          { ...getEntryNestedWithIdMock(), entries: [{ ...getEntryMatchAnyWithIdMock() }] },
        ],
      };
      expect(output).toEqual(expected);
    });

    test('it removes entire nested entry if after deleting specified nested entry, there are no more nested entries left', () => {
      const payloadItem: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            ...getEntryNestedWithIdMock(),
            entries: [{ ...getEntryExistsWithIdMock() }],
          },
        ],
      };
      const output = getUpdatedEntriesOnDelete(payloadItem, 0, 0);
      const expected: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [],
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getFormattedBuilderEntry', () => {
    test('it returns entry with a value for "correspondingKeywordField" when "item.field" is of type "text" and matching keyword field exists', () => {
      const payloadIndexPattern: DataViewBase = {
        ...getMockIndexPattern(),
        fields: [
          ...fields,
          {
            aggregatable: false,
            count: 0,
            esTypes: ['text'],
            name: 'machine.os.raw.text',
            readFromDocValues: true,
            scripted: false,
            searchable: false,
            type: 'string',
          },
        ],
      };
      const payloadItem: BuilderEntry = {
        ...getEntryMatchWithIdMock(),
        field: 'machine.os.raw.text',
        value: 'some os',
      };
      const output = getFormattedBuilderEntry(
        payloadIndexPattern,
        payloadItem,
        0,
        undefined,
        undefined,
        false
      );
      const field: FieldSpec = {
        aggregatable: false,
        count: 0,
        esTypes: ['text'],
        name: 'machine.os.raw.text',
        readFromDocValues: true,
        scripted: false,
        searchable: false,
        type: 'string',
      };
      const expected: FormattedBuilderEntry = {
        correspondingKeywordField: getField('machine.os.raw'),
        entryIndex: 0,
        field,
        id: '123',
        nested: undefined,
        operator: isOperator,
        parent: undefined,
        value: 'some os',
      };
      expect(output).toEqual(expected);
    });

    test('it returns entry with field value undefined if "allowCustomFieldOptions" is "false" and no matching field found', () => {
      const payloadIndexPattern: DataViewBase = {
        ...getMockIndexPattern(),
        fields: [
          ...fields,
          {
            aggregatable: false,
            count: 0,
            esTypes: ['text'],
            name: 'machine.os.raw.text',
            readFromDocValues: true,
            scripted: false,
            searchable: false,
            type: 'string',
          },
        ],
      };
      const payloadItem: BuilderEntry = {
        ...getEntryMatchWithIdMock(),
        field: 'custom.text',
        value: 'some os',
      };
      const output = getFormattedBuilderEntry(
        payloadIndexPattern,
        payloadItem,
        0,
        undefined,
        undefined,
        false
      );
      const expected: FormattedBuilderEntry = {
        correspondingKeywordField: undefined,
        entryIndex: 0,
        field: undefined,
        id: '123',
        nested: undefined,
        operator: isOperator,
        parent: undefined,
        value: 'some os',
      };
      expect(output).toEqual(expected);
    });

    test('it returns entry with custom field value if "allowCustomFieldOptions" is "true" and no matching field found', () => {
      const payloadIndexPattern: DataViewBase = {
        ...getMockIndexPattern(),
        fields: [
          ...fields,
          {
            aggregatable: false,
            count: 0,
            esTypes: ['text'],
            name: 'machine.os.raw.text',
            readFromDocValues: true,
            scripted: false,
            searchable: false,
            type: 'string',
          },
        ],
      };
      const payloadItem: BuilderEntry = {
        ...getEntryMatchWithIdMock(),
        field: 'custom.text',
        value: 'some os',
      };
      const output = getFormattedBuilderEntry(
        payloadIndexPattern,
        payloadItem,
        0,
        undefined,
        undefined,
        true
      );
      const expected: FormattedBuilderEntry = {
        correspondingKeywordField: undefined,
        entryIndex: 0,
        field: {
          name: 'custom.text',
          type: 'keyword',
        },
        id: '123',
        nested: undefined,
        operator: isOperator,
        parent: undefined,
        value: 'some os',
      };
      expect(output).toEqual(expected);
    });

    test('it returns "FormattedBuilderEntry" with value "nested" of "child" when "parent" and "parentIndex" are defined', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const payloadItem: BuilderEntry = { ...getEntryMatchWithIdMock(), field: 'child' };
      const payloadParent: EntryNested = {
        ...getEntryNestedWithIdMock(),
        entries: [{ ...getEntryMatchWithIdMock(), field: 'child' }],
        field: 'nestedField',
      };
      const output = getFormattedBuilderEntry(
        payloadIndexPattern,
        payloadItem,
        0,
        payloadParent,
        1,
        false
      );
      const field: FieldSpec = {
        aggregatable: false,
        count: 0,
        esTypes: ['text'],
        name: 'child',
        readFromDocValues: false,
        scripted: false,
        searchable: true,
        subType: {
          nested: {
            path: 'nestedField',
          },
        },
        type: 'string',
      };
      const expected: FormattedBuilderEntry = {
        correspondingKeywordField: undefined,
        entryIndex: 0,
        field,
        id: '123',
        nested: 'child',
        operator: isOperator,
        parent: {
          parent: {
            entries: [{ ...payloadItem }],
            field: 'nestedField',
            id: '123',
            type: OperatorTypeEnum.NESTED,
          },
          parentIndex: 1,
        },
        value: 'some host name',
      };
      expect(output).toEqual(expected);
    });

    test('it returns non nested "FormattedBuilderEntry" when "parent" and "parentIndex" are not defined', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const payloadItem: BuilderEntry = {
        ...getEntryMatchWithIdMock(),
        field: 'ip',
        value: 'some ip',
      };
      const output = getFormattedBuilderEntry(
        payloadIndexPattern,
        payloadItem,
        0,
        undefined,
        undefined,
        false
      );
      const field: FieldSpec = {
        aggregatable: true,
        count: 0,
        esTypes: ['ip'],
        name: 'ip',
        readFromDocValues: true,
        scripted: false,
        searchable: true,
        type: 'ip',
      };
      const expected: FormattedBuilderEntry = {
        correspondingKeywordField: undefined,
        entryIndex: 0,
        field,
        id: '123',
        nested: undefined,
        operator: isOperator,
        parent: undefined,
        value: 'some ip',
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#isEntryNested', () => {
    test('it returns "false" if payload is not of type EntryNested', () => {
      const payload: BuilderEntry = getEntryMatchWithIdMock();
      const output = isEntryNested(payload);
      const expected = false;
      expect(output).toEqual(expected);
    });

    test('it returns "true if payload is of type EntryNested', () => {
      const payload: EntryNested = getEntryNestedWithIdMock();
      const output = isEntryNested(payload);
      const expected = true;
      expect(output).toEqual(expected);
    });
  });

  describe('#getCorrespondingKeywordField', () => {
    test('it returns matching keyword field if "selectedFieldIsTextType" is true and keyword field exists', () => {
      const output = getCorrespondingKeywordField({
        fields,
        selectedField: 'machine.os.raw.text',
      });

      expect(output).toEqual(getField('machine.os.raw'));
    });

    test('it returns undefined if "selectedFieldIsTextType" is false', () => {
      const output = getCorrespondingKeywordField({
        fields,
        selectedField: 'machine.os.raw',
      });

      expect(output).toEqual(undefined);
    });

    test('it returns undefined if "selectedField" is empty string', () => {
      const output = getCorrespondingKeywordField({
        fields,
        selectedField: '',
      });

      expect(output).toEqual(undefined);
    });

    test('it returns undefined if "selectedField" is undefined', () => {
      const output = getCorrespondingKeywordField({
        fields,
        selectedField: undefined,
      });

      expect(output).toEqual(undefined);
    });
  });

  describe('#getOperatorType', () => {
    test('returns operator type "match" if entry.type is "match"', () => {
      const payload = getEntryMatchMock();
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorTypeEnum.MATCH);
    });

    test('returns operator type "match_any" if entry.type is "match_any"', () => {
      const payload = getEntryMatchAnyMock();
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorTypeEnum.MATCH_ANY);
    });

    test('returns operator type "list" if entry.type is "list"', () => {
      const payload = getEntryListMock();
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorTypeEnum.LIST);
    });

    test('returns operator type "exists" if entry.type is "exists"', () => {
      const payload = getEntryExistsMock();
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorTypeEnum.EXISTS);
    });
  });

  describe('#getExceptionOperatorSelect', () => {
    test('it returns "isOperator" when "operator" is "included" and operator type is "match"', () => {
      const payload = getEntryMatchMock();
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isOperator);
    });

    test('it returns "isNotOperator" when "operator" is "excluded" and operator type is "match"', () => {
      const payload = getEntryMatchMock();
      payload.operator = 'excluded';
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isNotOperator);
    });

    test('it returns "isOneOfOperator" when "operator" is "included" and operator type is "match_any"', () => {
      const payload = getEntryMatchAnyMock();
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isOneOfOperator);
    });

    test('it returns "isNotOneOfOperator" when "operator" is "excluded" and operator type is "match_any"', () => {
      const payload = getEntryMatchAnyMock();
      payload.operator = 'excluded';
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isNotOneOfOperator);
    });

    test('it returns "existsOperator" when "operator" is "included" and no operator type is provided', () => {
      const payload = getEntryExistsMock();
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(existsOperator);
    });

    test('it returns "doesNotExistsOperator" when "operator" is "excluded" and no operator type is provided', () => {
      const payload = getEntryExistsMock();
      payload.operator = 'excluded';
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(doesNotExistOperator);
    });

    test('it returns "isInList" when "operator" is "included" and operator type is "list"', () => {
      const payload = getEntryListMock();
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isInListOperator);
    });

    test('it returns "isNotInList" when "operator" is "excluded" and operator type is "list"', () => {
      const payload = getEntryListMock();
      payload.operator = 'excluded';
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isNotInListOperator);
    });
  });

  describe('#filterExceptionItems', () => {
    // Please see `x-pack/solutions/security/plugins/lists/public/exceptions/transforms.ts` doc notes
    // for context around the temporary `id`
    test('it correctly validates entries that include a temporary `id`', () => {
      const output: ExceptionsBuilderReturnExceptionItem[] = filterExceptionItems([
        { ...getExceptionListItemSchemaMock(), entries: ENTRIES_WITH_IDS },
      ]);

      expect(output).toEqual([{ ...getExceptionListItemSchemaMock(), entries: ENTRIES_WITH_IDS }]);
    });

    test('it removes entry items with "value" of "undefined"', () => {
      const { entries, ...rest } = getExceptionListItemSchemaMock();
      const mockEmptyException: EmptyEntry = {
        field: 'host.name',
        id: '123',
        operator: OperatorEnum.INCLUDED,
        type: OperatorTypeEnum.MATCH,
        value: undefined,
      };
      const exceptions = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(exceptions).toEqual([getExceptionListItemSchemaMock()]);
    });

    test('it removes "match" entry items with "value" of empty string', () => {
      const { entries, ...rest } = { ...getExceptionListItemSchemaMock() };
      const mockEmptyException: EmptyEntry = {
        field: 'host.name',
        id: '123',
        operator: OperatorEnum.INCLUDED,
        type: OperatorTypeEnum.MATCH,
        value: '',
      };
      const output: ExceptionsBuilderReturnExceptionItem[] = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(output).toEqual([{ ...getExceptionListItemSchemaMock() }]);
    });

    test('it removes "match" entry items with "field" of empty string', () => {
      const { entries, ...rest } = { ...getExceptionListItemSchemaMock() };
      const mockEmptyException: EmptyEntry = {
        field: '',
        id: '123',
        operator: OperatorEnum.INCLUDED,
        type: OperatorTypeEnum.MATCH,
        value: 'some value',
      };
      const output: ExceptionsBuilderReturnExceptionItem[] = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(output).toEqual([{ ...getExceptionListItemSchemaMock() }]);
    });

    test('it removes "match_any" entry items with "field" of empty string', () => {
      const { entries, ...rest } = { ...getExceptionListItemSchemaMock() };
      const mockEmptyException: EmptyEntry = {
        field: '',
        id: '123',
        operator: OperatorEnum.INCLUDED,
        type: OperatorTypeEnum.MATCH_ANY,
        value: ['some value'],
      };
      const output: ExceptionsBuilderReturnExceptionItem[] = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(output).toEqual([{ ...getExceptionListItemSchemaMock() }]);
    });

    test('it removes "nested" entry items with "field" of empty string', () => {
      const { entries, ...rest } = { ...getExceptionListItemSchemaMock() };
      const mockEmptyException: EntryNested = {
        entries: [getEntryMatchMock()],
        field: '',
        type: OperatorTypeEnum.NESTED,
      };
      const output: ExceptionsBuilderReturnExceptionItem[] = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(output).toEqual([{ ...getExceptionListItemSchemaMock() }]);
    });

    test('it removes the "nested" entry entries with "value" of empty string', () => {
      const { entries, ...rest } = { ...getExceptionListItemSchemaMock() };
      const mockEmptyException: EntryNested = {
        entries: [getEntryMatchMock(), { ...getEntryMatchMock(), value: '' }],
        field: 'host.name',
        type: OperatorTypeEnum.NESTED,
      };
      const output: ExceptionsBuilderReturnExceptionItem[] = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(output).toEqual([
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            ...getExceptionListItemSchemaMock().entries,
            { ...mockEmptyException, entries: [getEntryMatchMock()] },
          ],
        },
      ]);
    });

    test('it removes the "nested" entry item if all its entries are invalid', () => {
      const { entries, ...rest } = { ...getExceptionListItemSchemaMock() };
      const mockEmptyException: EntryNested = {
        entries: [{ ...getEntryMatchMock(), value: '' }],
        field: 'host.name',
        type: OperatorTypeEnum.NESTED,
      };
      const output: ExceptionsBuilderReturnExceptionItem[] = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(output).toEqual([{ ...getExceptionListItemSchemaMock() }]);
    });

    test('it removes `temporaryId` from "createExceptionListItemSchema" items', () => {
      const { meta, ...rest } = getNewExceptionItem({
        listId: '123',
        name: 'rule name',
        namespaceType: 'single',
      });
      const exceptions = filterExceptionItems([{ ...rest, entries: [getEntryMatchMock()], meta }]);

      expect(exceptions).toEqual([{ ...rest, entries: [getEntryMatchMock()], meta: undefined }]);
    });

    test('it removes `temporaryId` from "createRuleExceptionListItemSchema" items', () => {
      const { meta, ...rest } = getNewExceptionItem({
        listId: undefined,
        name: 'rule name',
        namespaceType: undefined,
      });
      const exceptions = filterExceptionItems([{ ...rest, entries: [getEntryMatchMock()], meta }]);

      expect(exceptions).toEqual([{ ...rest, entries: [getEntryMatchMock()], meta: undefined }]);
    });
  });

  describe('#getNewExceptionItem', () => {
    it('returns new item with updated name', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { meta, ...rest } = getNewExceptionItem({
        listId: '123',
        name: 'My Item Name',
        namespaceType: 'single',
      });

      expect(rest.name).toEqual('My Item Name');
    });

    it('returns new item with list_id if one is passed in', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { meta, ...rest } = getNewExceptionItem({
        listId: '123',
        name: 'My Item Name',
        namespaceType: 'single',
      });

      expect(rest).toEqual({
        comments: [],
        description: 'Exception list item',
        entries: [{ field: '', id: '123', operator: 'included', type: 'match', value: '' }],
        item_id: undefined,
        list_id: '123',
        name: 'My Item Name',
        namespace_type: 'single',
        tags: [],
        type: 'simple',
      });
    });

    it('returns new item without list_id if none is passed in', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { meta, ...rest } = getNewExceptionItem({
        listId: undefined,
        name: 'My Item Name',
        namespaceType: 'single',
      });

      expect(rest).toEqual({
        comments: [],
        description: 'Exception list item',
        entries: [{ field: '', id: '123', operator: 'included', type: 'match', value: '' }],
        item_id: undefined,
        list_id: undefined,
        name: 'My Item Name',
        namespace_type: 'single',
        tags: [],
        type: 'simple',
      });
    });

    it('returns new item with namespace_type if one is passed in', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { meta, ...rest } = getNewExceptionItem({
        listId: '123',
        name: 'My Item Name',
        namespaceType: 'single',
      });

      expect(rest).toEqual({
        comments: [],
        description: 'Exception list item',
        entries: [{ field: '', id: '123', operator: 'included', type: 'match', value: '' }],
        item_id: undefined,
        list_id: '123',
        name: 'My Item Name',
        namespace_type: 'single',
        tags: [],
        type: 'simple',
      });
    });

    it('returns new item without namespace_type if none is passed in', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { meta, ...rest } = getNewExceptionItem({
        listId: '123',
        name: 'My Item Name',
        namespaceType: undefined,
      });

      expect(rest).toEqual({
        comments: [],
        description: 'Exception list item',
        entries: [{ field: '', id: '123', operator: 'included', type: 'match', value: '' }],
        item_id: undefined,
        list_id: '123',
        name: 'My Item Name',
        namespace_type: undefined,
        tags: [],
        type: 'simple',
      });
    });
  });

  describe('#getEntryValue', () => {
    it('returns "match" entry value', () => {
      const payload = getEntryMatchMock();
      const result = getEntryValue(payload);
      const expected = 'some host name';
      expect(result).toEqual(expected);
    });

    it('returns "match any" entry values', () => {
      const payload = getEntryMatchAnyMock();
      const result = getEntryValue(payload);
      const expected = ['some host name'];
      expect(result).toEqual(expected);
    });

    it('returns "exists" entry value', () => {
      const payload = getEntryExistsMock();
      const result = getEntryValue(payload);
      const expected = undefined;
      expect(result).toEqual(expected);
    });

    it('returns "list" entry value', () => {
      const payload = getEntryListMock();
      const result = getEntryValue(payload);
      const expected = 'some-list-id';
      expect(result).toEqual(expected);
    });
  });
});
