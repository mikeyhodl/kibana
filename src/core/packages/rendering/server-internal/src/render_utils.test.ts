/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getThemeStylesheetPaths, getCommonStylesheetPaths, getScriptPaths } from './render_utils';

describe('getScriptPaths', () => {
  it('returns the correct list when darkMode is `system`', () => {
    expect(
      getScriptPaths({
        baseHref: '/base-path',
        darkMode: 'system',
        themeName: 'borealis',
      })
    ).toEqual(['/base-path/ui/bootstrap_system_theme_borealis.js']);
  });

  it('returns the correct list when darkMode is `true`', () => {
    expect(
      getScriptPaths({
        baseHref: '/base-path',
        darkMode: true,
        themeName: 'borealis',
      })
    ).toEqual([]);
  });

  it('returns the correct list when darkMode is `false`', () => {
    expect(
      getScriptPaths({
        baseHref: '/base-path',
        darkMode: false,
        themeName: 'borealis',
      })
    ).toEqual([]);
  });
});

describe('getCommonStylesheetPaths', () => {
  it('returns the correct list', () => {
    expect(
      getCommonStylesheetPaths({
        baseHref: '/base-path',
      })
    ).toMatchInlineSnapshot(`
      Array [
        "/base-path/bundles/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.css",
        "/base-path/ui/legacy_styles.css",
      ]
    `);
  });
});

describe('getStylesheetPaths', () => {
  describe('when darkMode is `true`', () => {
    it('returns the correct list', () => {
      expect(
        getThemeStylesheetPaths({
          darkMode: true,
          baseHref: '/base-path/buildShaShort',
        })
      ).toMatchInlineSnapshot(`
          Array [
            "/base-path/buildShaShort/ui/legacy_dark_theme.min.css",
          ]
        `);
    });
  });
  describe('when darkMode is `false`', () => {
    it('returns the correct list', () => {
      expect(
        getThemeStylesheetPaths({
          darkMode: false,
          baseHref: '/base-path/buildShaShort',
        })
      ).toMatchInlineSnapshot(`
          Array [
            "/base-path/buildShaShort/ui/legacy_light_theme.min.css",
          ]
        `);
    });
  });
});
