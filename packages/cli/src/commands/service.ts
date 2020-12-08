/*
*                      Copyright 2020 Salto Labs Ltd.
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
import { AdapterAuthMethod, AdapterAuthentication, InstanceElement, ObjectType, OAuthMethod, ElemID } from '@salto-io/adapter-api'
import _ from 'lodash'
import { EOL } from 'os'
import { logger } from '@salto-io/logging'
import { addAdapter, getLoginStatuses, LoginStatus, updateCredentials, loadLocalWorkspace, getAdaptersCredentialsTypes, installAdapter } from '@salto-io/core'
import { Workspace } from '@salto-io/workspace'
import { getCredentialsFromUser } from '../callbacks'
import { CliOutput, CliExitCode } from '../types'
import { createCommandGroupDef, createPublicCommandDef, CommandDefAction, KeyedOption } from '../command_builder'
import { formatServiceAlreadyAdded, formatServiceAdded, formatLoginToServiceFailed, formatCredentialsHeader, formatLoginUpdated, formatConfiguredServices, formatServiceNotConfigured, formatLoginOverride } from '../formatter'
import { errorOutputLine, outputLine } from '../outputer'
import { processOauthCredentials } from '../cli_oauth_authenticator'
import { EnvArg, ENVIORMENT_OPTION } from './common/env'

const log = logger(module)

type AuthTypeArgs = {
  authType: AdapterAuthMethod
}

const AUTH_TYPE_OPTION: KeyedOption<AuthTypeArgs> = {
  name: 'authType',
  alias: 'a',
  description: 'The type of authorization you would like to use for the service. Options = [basic, oauth]',
  type: 'string',
  required: false,
  choices: ['basic', 'oauth'],
  default: 'basic',
}

const getOauthConfig = async (
  oauthMethod: OAuthMethod,
  output: CliOutput,
  getLoginInput: (configType: ObjectType) => Promise<InstanceElement>,
): Promise<InstanceElement> => {
  outputLine(formatCredentialsHeader(oauthMethod.oauthRequestParameters.elemID.adapter), output)
  const newConfig = await getLoginInput(oauthMethod.oauthRequestParameters)
  const oauthParameters = oauthMethod.createOAuthRequest(newConfig)
  const credentials = oauthMethod.createFromOauthResponse(newConfig.value,
    await processOauthCredentials(newConfig.value.port,
      oauthParameters.accessTokenField, oauthParameters.url, output))
  return new InstanceElement(ElemID.CONFIG_NAME, oauthMethod.credentialsType, credentials)
}

const getConfigFromInput = async (
  authType: AdapterAuthMethod,
  authMethods: AdapterAuthentication,
  output: CliOutput,
  getLoginInput: (configType: ObjectType) =>
    Promise<InstanceElement>): Promise<InstanceElement> => {
  let newConfig: InstanceElement
  if (authType === 'oauth' && authMethods.oauth) {
    newConfig = await getOauthConfig(authMethods.oauth, output, getLoginInput)
  } else {
    const configType = authMethods[authType]
    if (configType) {
      outputLine(formatCredentialsHeader(configType.credentialsType.elemID.adapter), output)
      newConfig = await getLoginInput(configType.credentialsType)
    } else {
      throw new Error(`Adapter does not support authentication of type ${authType}`)
    }
  }
  newConfig.value.authType = authType
  return newConfig
}

const getLoginInputFlow = async (
  workspace: Workspace,
  authMethods: AdapterAuthentication,
  output: CliOutput,
  authType: AdapterAuthMethod,
): Promise<void> => {
  const newConfig = await getConfigFromInput(authType, authMethods, output, getCredentialsFromUser)
  await updateCredentials(workspace, newConfig)
  output.stdout.write(EOL)
  outputLine(formatLoginUpdated, output)
}

const loadWorkspace = async (workspaceDir: string, inputEnvironment?: string):
Promise<Workspace> => {
  const workspace = await loadLocalWorkspace(workspaceDir)
  if (!_.isUndefined(inputEnvironment)) {
    await workspace.setCurrentEnv(inputEnvironment, false)
  }
  return workspace
}

// Add
type ServiceAddArgs = {
    login: boolean
    serviceName: string
} & AuthTypeArgs & EnvArg

export const addAction: CommandDefAction<ServiceAddArgs> = async ({
  input,
  output,
  workspacePath = '.',
}): Promise<CliExitCode> => {
  log.debug('running service add command on \'%s\' %o', workspacePath, input)
  const { login, serviceName, authType, env } = input
  const workspace = await loadWorkspace(workspacePath, env)
  if (workspace.services().includes(serviceName)) {
    errorOutputLine(formatServiceAlreadyAdded(serviceName), output)
    return CliExitCode.UserInputError
  }

  await installAdapter(serviceName)
  if (login) {
    const adapterCredentialsTypes = getAdaptersCredentialsTypes([serviceName])[serviceName]
    try {
      await getLoginInputFlow(workspace, adapterCredentialsTypes, output, authType)
    } catch (e) {
      errorOutputLine(formatLoginToServiceFailed(serviceName, e.message), output)
      return CliExitCode.AppError
    }
  }

  await addAdapter(workspace, serviceName)
  outputLine(formatServiceAdded(serviceName), output)
  return CliExitCode.Success
}

const serviceAddDef = createPublicCommandDef({
  properties: {
    name: 'add',
    description: 'Add a new service to the environment',
    keyedOptions: [
      {
        // Will be replaced with --no-login
        name: 'login',
        default: true,
        alias: 'n',
        type: 'boolean',
        description: 'Do not login to service when adding it. Example usage: \'service add <service-name> --no-login\'.',
        required: false,
      },
      AUTH_TYPE_OPTION,
      ENVIORMENT_OPTION,
    ],
    positionalOptions: [
      {
        name: 'serviceName',
        type: 'string',
        description: 'The name of the service',
        required: true,
      },
    ],
  },
  action: addAction,
})

// List
type ServiceListArgs = {} & EnvArg

export const listAction: CommandDefAction<ServiceListArgs> = async (
  { input, output, workspacePath = '.' },
): Promise<CliExitCode> => {
  log.debug('running service list command on \'%s\' %o', workspacePath, input)
  const { env } = input
  const workspace = await loadWorkspace(workspacePath, env)
  outputLine(formatConfiguredServices(workspace.services()), output)
  return CliExitCode.Success
}

const serviceListDef = createPublicCommandDef({
  properties: {
    name: 'list',
    description: 'List environment services',
    keyedOptions: [
      ENVIORMENT_OPTION,
    ],
  },
  action: listAction,
})

// Login
type ServiceLoginArgs = {
    serviceName: string
} & AuthTypeArgs & EnvArg

export const loginAction: CommandDefAction<ServiceLoginArgs> = async ({
  input,
  output,
  workspacePath = '.',
}): Promise<CliExitCode> => {
  log.debug('running service login command on \'%s\' %o', workspacePath, input)
  const { serviceName, authType, env } = input
  const workspace = await loadWorkspace(workspacePath, env)
  if (!workspace.services().includes(serviceName)) {
    errorOutputLine(formatServiceNotConfigured(serviceName), output)
    return CliExitCode.AppError
  }
  const serviceLoginStatus = (await getLoginStatuses(
    workspace,
    [serviceName]
  ))[serviceName] as LoginStatus
  if (serviceLoginStatus.isLoggedIn) {
    outputLine(formatLoginOverride, output)
  }
  try {
    await getLoginInputFlow(workspace, serviceLoginStatus.configTypeOptions, output, authType)
  } catch (e) {
    errorOutputLine(formatLoginToServiceFailed(serviceName, e.message), output)
    return CliExitCode.AppError
  }
  return CliExitCode.Success
}

const serviceLoginDef = createPublicCommandDef({
  properties: {
    name: 'login',
    description: 'Set the environment service credentials',
    keyedOptions: [
      AUTH_TYPE_OPTION,
      ENVIORMENT_OPTION,
    ],
    positionalOptions: [
      {
        name: 'serviceName',
        type: 'string',
        description: 'The name of the service',
        required: true,
      },
    ],
  },
  action: loginAction,
})

const serviceGroupDef = createCommandGroupDef({
  properties: {
    name: 'service',
    description: 'Manage the environment services',
  },
  subCommands: [
    serviceAddDef,
    serviceListDef,
    serviceLoginDef,
  ],
})

export default serviceGroupDef
