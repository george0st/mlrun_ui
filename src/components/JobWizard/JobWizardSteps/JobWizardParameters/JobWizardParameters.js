/*
Copyright 2019 Iguazio Systems Ltd.

Licensed under the Apache License, Version 2.0 (the "License") with
an addition restriction as set forth herein. You may not use this
file except in compliance with the License. You may obtain a copy of
the License at http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing
permissions and limitations under the License.

In addition, you may not use the software for any purposes that are
illegal under applicable law, and the grant of the foregoing license
under the Apache 2.0 license is conditioned upon your compliance with
such restriction.
*/
import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { get } from 'lodash'

import { FormInput, FormRadio } from 'igz-controls/components'
import FormParametersTable from '../../../../elements/FormParametersTable/FormParametersTable'

import { PARAMETERS_FROM_UI_VALUE, PARAMETERS_FROM_FILE_VALUE } from '../../../../constants'

import './jobWizardParameters.scss'

const JobWizardParameters = ({ formState }) => {
  const parametersFromPath = 'parameters.parametersFrom'
  const parametersFromFileUrlPath = 'parameters.parametersFromFileUrl'

  const selectedFromValue = useMemo(
    () => get(formState.values, parametersFromPath, PARAMETERS_FROM_UI_VALUE),
    [formState.values]
  )
  const hyperParametersAreEnabled = useMemo(() => {
    return formState.values.runDetails?.hyperparameter
  }, [formState.values.runDetails?.hyperparameter])

  return (
    <div className="job-wizard__parameters form">
      <div className="form-row">
        <h5 className="form-step-title">Parameters</h5>
      </div>
      {hyperParametersAreEnabled && (
        <div className="form-row">
          <FormRadio name={parametersFromPath} value={PARAMETERS_FROM_UI_VALUE} label="From UI" />
          <FormRadio
            name={parametersFromPath}
            value={PARAMETERS_FROM_FILE_VALUE}
            label="From file"
          />
          <FormInput
            name={parametersFromFileUrlPath}
            placeholder="URL for a JSON or CSV file"
            disabled={selectedFromValue !== PARAMETERS_FROM_FILE_VALUE}
          />
        </div>
      )}
      <FormParametersTable
        fieldsPath="parameters.parametersTable"
        formState={formState}
        withHyperparameters={
          hyperParametersAreEnabled && selectedFromValue === PARAMETERS_FROM_UI_VALUE
        }
      />
    </div>
  )
}

JobWizardParameters.propTypes = {
  formState: PropTypes.shape({}).isRequired
}

export default JobWizardParameters
