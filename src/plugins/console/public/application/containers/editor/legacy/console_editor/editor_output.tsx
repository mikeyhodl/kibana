/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';
import { convertMapboxVectorTileToJson } from './mapbox_vector_tile';
import { Mode } from '../../../../models/legacy_core_editor/mode/output';

// Ensure the modes we might switch to dynamically are available
import 'brace/mode/text';
import 'brace/mode/hjson';
import 'brace/mode/yaml';

import {
  useEditorReadContext,
  useRequestReadContext,
  useServicesContext,
} from '../../../../contexts';
import { createReadOnlyAceEditor, CustomAceEditor } from '../../../../models/legacy_core_editor';
import { subscribeResizeChecker } from '../subscribe_console_resize_checker';
import { applyCurrentSettings } from './apply_editor_settings';
import { isJSONContentType, isMapboxVectorTile, safeExpandLiteralStrings } from '../../utilities';

function modeForContentType(contentType?: string) {
  if (!contentType) {
    return 'ace/mode/text';
  }
  if (isJSONContentType(contentType) || isMapboxVectorTile(contentType)) {
    // Using hjson will allow us to use comments in editor output and solves the problem with error markers
    return 'ace/mode/hjson';
  } else if (contentType.indexOf('application/yaml') >= 0) {
    return 'ace/mode/yaml';
  }
  return 'ace/mode/text';
}

function EditorOutputUI() {
  const editorRef = useRef<null | HTMLDivElement>(null);
  const editorInstanceRef = useRef<null | CustomAceEditor>(null);
  const { services } = useServicesContext();
  const { settings: readOnlySettings } = useEditorReadContext();
  const {
    lastResult: { data, error },
  } = useRequestReadContext();
  const inputId = 'ConAppOutputTextarea';

  useEffect(() => {
    editorInstanceRef.current = createReadOnlyAceEditor(editorRef.current!);
    const unsubscribe = subscribeResizeChecker(editorRef.current!, editorInstanceRef.current);
    const textarea = editorRef.current!.querySelector('textarea')!;
    textarea.setAttribute('id', inputId);
    textarea.setAttribute('readonly', 'true');

    return () => {
      unsubscribe();
      editorInstanceRef.current!.destroy();
    };
  }, [services.settings]);

  useEffect(() => {
    const editor = editorInstanceRef.current!;
    if (data) {
      const isMultipleRequest = data.length > 1;
      const mode = isMultipleRequest
        ? new Mode()
        : modeForContentType(data[0].response.contentType);
      editor.update(
        data
          .map((result) => {
            const { value, contentType } = result.response;

            let editorOutput;
            if (readOnlySettings.tripleQuotes && isJSONContentType(contentType)) {
              editorOutput = safeExpandLiteralStrings(value as string);
            } else if (isMapboxVectorTile(contentType)) {
              const vectorTile = new VectorTile(new Protobuf(value as ArrayBuffer));
              const vectorTileJson = convertMapboxVectorTileToJson(vectorTile);
              editorOutput = safeExpandLiteralStrings(vectorTileJson as string);
            } else {
              editorOutput = value;
            }

            return editorOutput;
          })
          .join('\n'),
        mode
      );
    } else if (error) {
      const mode = modeForContentType(error.response.contentType);
      editor.update(error.response.value as string, mode);
    } else {
      editor.update('');
    }
  }, [readOnlySettings, data, error]);

  useEffect(() => {
    applyCurrentSettings(editorInstanceRef.current!, readOnlySettings);
  }, [readOnlySettings]);

  return (
    <>
      <EuiScreenReaderOnly>
        <label htmlFor={inputId}>
          {i18n.translate('console.outputTextarea', {
            defaultMessage: 'Dev Tools Console output',
          })}
        </label>
      </EuiScreenReaderOnly>
      <div ref={editorRef} className="conApp__output" data-test-subj="response-editor">
        <div className="conApp__outputContent" id="ConAppOutput" />
      </div>
    </>
  );
}

export const EditorOutput = React.memo(EditorOutputUI);
