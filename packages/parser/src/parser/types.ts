/*
 * Copyright 2024 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */

import { SaltoError, Element } from '@salto-io/adapter-api'
import { collections } from '@salto-io/lowerdash'
import { HclParseError } from './internal/types'
import { SourceMap } from './source_map'

type ThenableIterable<T> = collections.asynciterable.ThenableIterable<T>
export type ParseError = HclParseError & SaltoError

export type ParseResult = {
  elements: ThenableIterable<Element>
  errors: ParseError[]
  sourceMap?: SourceMap
}