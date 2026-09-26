import { existsSync } from 'node:fs'
import path from 'node:path'

/**
 * True only in the template repo itself, where content/ is the template's
 * own default content. Client repos (copied from this template) have their
 * own content/ and no marker, so specs that assert the template's default
 * pages / design.json skip there. Content-agnostic checks must NOT use this.
 */
export const TEMPLATE_DEFAULT_MARKER = path.resolve(__dirname, '..', 'content', '.template-default')
export const IS_TEMPLATE_DEFAULT = existsSync(TEMPLATE_DEFAULT_MARKER)
export const NOT_TEMPLATE_DEFAULT_REASON =
  'content/ is not the template default (no content/.template-default marker)'
