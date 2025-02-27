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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { connect, useDispatch, useSelector } from 'react-redux'

import AddToFeatureVectorPopUp from '../../../elements/AddToFeatureVectorPopUp/AddToFeatureVectorPopUp'
import FeaturesTablePanel from '../../../elements/FeaturesTablePanel/FeaturesTablePanel'
import FeaturesView from './FeaturesView'
import { FeatureStoreContext } from '../FeatureStore'

import {
  FEATURES_TAB,
  FEATURE_STORE_PAGE,
  GROUP_BY_NAME,
  GROUP_BY_NONE,
  TAG_FILTER_ALL_ITEMS
} from '../../../constants'
import { createFeaturesRowData } from '../../../utils/createFeatureStoreContent'
import { featuresActionCreator, featuresFilters } from './features.util'
import { getFeatureIdentifier } from '../../../utils/getUniqueIdentifier'
import { getFilterTagOptions, setFilters } from '../../../reducers/filtersReducer'
import { parseFeatures } from '../../../utils/parseFeatures'
import { setTablePanelOpen } from '../../../reducers/tableReducer'
import { useGetTagOptions } from '../../../hooks/useGetTagOptions.hook'
import { useGroupContent } from '../../../hooks/groupContent.hook'

import { ReactComponent as Yaml } from 'igz-controls/images/yaml.svg'

const Features = ({
  fetchEntity,
  fetchFeature,
  fetchEntities,
  fetchFeatures,
  fetchFeatureSetsTags,
  fetchFeatureVectors,
  removeEntity,
  removeFeature,
  removeFeatures,
  removeEntities
}) => {
  const [features, setFeatures] = useState([])
  const [selectedRowData, setSelectedRowData] = useState({})
  const [urlTagOption] = useGetTagOptions(fetchFeatureSetsTags, featuresFilters)
  const params = useParams()
  const featureStore = useSelector(store => store.featureStore)
  const filtersStore = useSelector(store => store.filtersStore)
  const tableStore = useSelector(store => store.tableStore)
  const featureStoreRef = useRef(null)
  const dispatch = useDispatch()

  const { toggleConvertedYaml } = React.useContext(FeatureStoreContext)

  const pageData = useMemo(
    () => ({ page: FEATURE_STORE_PAGE, tablePanel: <FeaturesTablePanel /> }),
    []
  )

  const actionsMenu = useMemo(
    () => [
      {
        label: 'View YAML',
        icon: <Yaml />,
        onClick: toggleConvertedYaml
      }
    ],
    [toggleConvertedYaml]
  )

  const fetchData = useCallback(
    filters => {
      const config = {
        cancelToken: new axios.CancelToken(cancel => {
          featureStoreRef.current.cancel = cancel
        })
      }

      return Promise.allSettled([
        fetchFeatures(params.projectName, filters, config),
        fetchEntities(params.projectName, filters, config)
      ]).then(result => {
        if (result) {
          const features = result.reduce((prevValue, nextValue) => {
            return nextValue.value ? prevValue.concat(nextValue.value) : prevValue
          }, [])

          setFeatures(parseFeatures(features))

          return features
        }

        return result
      })
    },
    [fetchEntities, fetchFeatures, params.projectName]
  )

  const cancelRequest = message => {
    featureStoreRef.current?.cancel && featureStoreRef.current.cancel(message)
  }

  const handleRefresh = filters => {
    dispatch(getFilterTagOptions({ fetchTags: fetchFeatureSetsTags, project: params.projectName }))

    return fetchData(filters)
  }

  const handleRemoveFeature = useCallback(
    feature => {
      const newStoreSelectedRowData =
        feature.data.ui.type === 'feature'
          ? { ...featureStore.features.selectedRowData.content }
          : { ...featureStore.entities.selectedRowData.content }
      const newSelectedRowData = { ...selectedRowData }
      const removeData = feature.data.ui.type === 'feature' ? removeFeature : removeEntity

      delete newStoreSelectedRowData[feature.data.ui.identifier]
      delete newSelectedRowData[feature.data.ui.identifier]

      removeData(newStoreSelectedRowData)
      setSelectedRowData(newSelectedRowData)
    },
    [
      featureStore.features.selectedRowData.content,
      featureStore.entities.selectedRowData.content,
      selectedRowData,
      removeFeature,
      removeEntity
    ]
  )

  const handleRequestOnExpand = useCallback(
    feature => {
      const featureIdentifier = getFeatureIdentifier(feature)
      const fetchData = feature.ui?.type === 'feature' ? fetchFeature : fetchEntity

      setSelectedRowData(state => ({
        ...state,
        [featureIdentifier]: {
          loading: true
        }
      }))

      fetchData(feature.metadata.project, feature.name, feature.metadata.name)
        .then(result => {
          if (result?.length > 0) {
            const content = [...parseFeatures(result)].map(contentItem =>
              createFeaturesRowData(contentItem, tableStore.isTablePanelOpen)
            )
            setSelectedRowData(state => ({
              ...state,
              [featureIdentifier]: {
                content,
                error: null,
                loading: false
              }
            }))
          }
        })
        .catch(error => {
          setSelectedRowData(state => ({
            ...state,
            [featureIdentifier]: {
              ...state.selectedRowData[featureIdentifier],
              error,
              loading: false
            }
          }))
        })
    },
    [fetchEntity, fetchFeature, tableStore.isTablePanelOpen]
  )

  const { latestItems, handleExpandRow } = useGroupContent(
    features,
    getFeatureIdentifier,
    handleRemoveFeature,
    handleRequestOnExpand,
    null,
    FEATURE_STORE_PAGE,
    FEATURES_TAB
  )

  const tableContent = useMemo(() => {
    return filtersStore.groupBy === GROUP_BY_NAME
      ? latestItems.map(contentItem => {
          return createFeaturesRowData(contentItem, tableStore.isTablePanelOpen, true)
        })
      : features.map(contentItem => createFeaturesRowData(contentItem, tableStore.isTablePanelOpen))
  }, [features, filtersStore.groupBy, latestItems, tableStore.isTablePanelOpen])

  const getPopUpTemplate = useCallback(
    action => {
      return (
        <AddToFeatureVectorPopUp
          action={action}
          currentProject={params.projectName}
          fetchFeatureVectors={fetchFeatureVectors}
        />
      )
    },
    [fetchFeatureVectors, params.projectName]
  )

  useEffect(() => {
    return () => {
      dispatch(setTablePanelOpen(false))
    }
  }, [params.projectName, dispatch])

  useEffect(() => {
    if (urlTagOption) {
      fetchData({
        tag: urlTagOption,
        iter: ''
      })
    }
  }, [fetchData, urlTagOption])

  useEffect(() => {
    if (filtersStore.tag === TAG_FILTER_ALL_ITEMS) {
      dispatch(setFilters({ groupBy: GROUP_BY_NAME }))
    } else if (filtersStore.groupBy === GROUP_BY_NAME) {
      dispatch(setFilters({ groupBy: GROUP_BY_NONE }))
    }
  }, [filtersStore.groupBy, filtersStore.tag, dispatch])

  useEffect(() => {
    return () => {
      setFeatures([])
      removeFeature()
      removeEntity()
      removeFeatures()
      removeEntities()
      setSelectedRowData({})
      cancelRequest('cancel')
    }
  }, [removeEntities, removeEntity, removeFeature, removeFeatures, params.projectName])

  return (
    <FeaturesView
      actionsMenu={actionsMenu}
      features={features}
      featureStore={featureStore}
      filtersStore={filtersStore}
      getPopUpTemplate={getPopUpTemplate}
      handleExpandRow={handleExpandRow}
      handleRefresh={handleRefresh}
      pageData={pageData}
      ref={featureStoreRef}
      selectedRowData={selectedRowData}
      tableContent={tableContent}
      tableStore={tableStore}
    />
  )
}

export default connect(null, {
  ...featuresActionCreator
})(Features)
