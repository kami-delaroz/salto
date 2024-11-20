/*
 * Copyright 2024 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { Values } from '@salto-io/adapter-api'

export type ExpressionType = 'list' | 'map' | 'template' | 'literal' | 'reference' | 'dynamic' | 'func'

export interface SourcePos {
  line: number
  col: number
  byte: number
}

export interface SourceRange {
  filename: string
  start: SourcePos
  end: SourcePos
}

export type HclExpression = {
  type: ExpressionType
  expressions: HclExpression[]
  source: SourceRange
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any
}

export type HclAttribute = {
  source: SourceRange
  expressions: HclExpression[]
}

export type HclBlock<AttrT = HclAttribute | Values> = {
  type: string
  labels: string[]
  attrs: Record<string, AttrT>
}

export type ParsedHclBlock = HclBlock<HclAttribute> & {
  blocks: ParsedHclBlock[]
  source: SourceRange
}

export type DumpedHclBlock = HclBlock<Values> & {
  blocks: DumpedHclBlock[]
}

// hcl.Diagnostic struct taken from
// https://github.com/hashicorp/hcl2/blob/f45c1cd/hcl/diagnostic.go#L26
// TODO: include expression and bubble up error message detail
export interface HclParseError {
  summary: string
  message: string
  subject: SourceRange
  context: SourceRange
}

export type ParsedHclBody = Pick<ParsedHclBlock, 'attrs' | 'blocks'>
export interface HclParseReturn {
  body: ParsedHclBody
  errors: HclParseError[]
}

export type DumpedHclBody = Pick<DumpedHclBlock, 'attrs' | 'blocks'>

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function isSourceRange(v: any): v is SourceRange {
  return v && typeof v.filename === 'string' && v.start && v.end
}

export class IllegalReference {
  constructor(
    public ref: string,
    public message: string,
  ) {}
}