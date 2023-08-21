/*
*                      Copyright 2023 Salto Labs Ltd.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with
* the License.  You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
export { neighborContextGetter, ContextFunc, ContextValueMapperFunc, findParentPath } from './context'
export { addReferences, replaceReferenceValues, generateLookupFunc } from './field_references'
export { createMissingInstance, createMissingValueReference, checkMissingRef, MISSING_REF_PREFIX } from './missing_references'
export {
  ReferenceSerializationStrategy,
  ReferenceSerializationStrategyName,
  ReferenceSerializationStrategyLookup,
  ReferenceSourceTransformationLookup,
  ReferenceSourceTransformationName,
  ReferenceSourceTransformation,
  MissingReferenceStrategy,
  MissingReferenceStrategyName,
  FieldReferenceDefinition,
  FieldReferenceResolver,
  ReferenceResolverFinder,
  ReferenceTargetDefinition,
  ExtendedReferenceTargetDefinition,
  LookupFunc,
  basicLookUp,
} from './reference_mapping'
