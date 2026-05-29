<<<<<<< /tmp/kpiport/mf/cur
import React from 'react'

import assetUtils from '#/assetUtils'
import bem from '#/bem'
import AssetName from '#/components/common/assetName'
import Icon from '#/components/common/icon'
import { ASSET_TYPES } from '#/constants'
import type { AssetResponse } from '#/dataInterface'
import { formatTime } from '#/utils'
import AssetActionButtons from './assetActionButtons'
import type { AssetsTableContextName } from './assetsTableConstants'
import { ASSETS_TABLE_CONTEXTS } from './assetsTableConstants'

interface AssetsTableRowProps {
  asset: AssetResponse
  context: AssetsTableContextName
=======
import React from 'react';
import autoBind from 'react-autobind';
import bem, {makeBem} from 'js/bem';
import AssetName from 'js/components/common/assetName';
import {formatTime} from 'js/utils';
import mixins from 'js/mixins';
import type {AssetResponse, AssetDownloads} from 'js/dataInterface';
import {ASSET_TYPES} from 'js/constants';
import assetUtils from 'js/assetUtils';
import type {AssetsTableContextName} from './assetsTableConstants';
import AssetCollectionActions from './assetCollectionActions';
import './assetActionButtons.scss';
import './assetTableRow.scss';

bem.AssetActionButtons = makeBem(null, 'asset-action-buttons', 'menu');
bem.AssetActionButtons__button = makeBem(bem.AssetActionButtons, 'button', 'a');
bem.AssetActionButtons__iconButton = makeBem(
  bem.AssetActionButtons,
  'icon-button',
  'a'
);

const assetActions = mixins.clickAssets.click.asset;

interface AssetsTableRowProps {
  asset: AssetResponse;
  context: AssetsTableContextName;
  showTag?: boolean;
>>>>>>> /tmp/kpiport/mf/fork
}

class AssetsTableRow extends React.Component<AssetsTableRowProps> {

  constructor(props: AssetsTableRowProps) {
    super(props);
    autoBind(this);
  }

  showTagsModal() {
    assetUtils.editTags(this.props.asset);
  }

  clone() {
    assetActions.clone(this.props.asset);
  }

  delete() {
    assetActions.delete(
      this.props.asset,
      assetUtils.getAssetDisplayName(this.props.asset).final,
      this.onDeleteComplete.bind(this)
    );
  }

  modifyDetails() {
    assetUtils.modifyDetails(this.props.asset);
  }

  onDeleteComplete() {
    // do nothing
  }

  render() {
    let rowCount = null
    if (this.props.asset.asset_type !== ASSET_TYPES.collection.id && this.props.asset.summary?.row_count) {
      rowCount = this.props.asset.summary.row_count
    } else if (this.props.asset.asset_type === ASSET_TYPES.collection.id && this.props.asset.children) {
      rowCount = this.props.asset.children.count
    }

<<<<<<< /tmp/kpiport/mf/cur
    return (
      <bem.AssetsTableRow m={['asset', `type-${this.props.asset.asset_type}`]}>
        <bem.AssetsTableRow__link href={`#/library/asset/${this.props.asset.uid}`} />

        <bem.AssetsTableRow__buttons>
          <AssetActionButtons asset={this.props.asset} />
        </bem.AssetsTableRow__buttons>

        <bem.AssetsTableRow__column m='icon-status'>
          <Icon name={assetUtils.getAssetIcon(this.props.asset)} size='l' />
        </bem.AssetsTableRow__column>

        <bem.AssetsTableRow__column m='name' dir='auto'>
          <AssetName asset={this.props.asset} />

          {this.props.asset.settings && this.props.asset.tag_string && this.props.asset.tag_string.length > 0 && (
=======
    let settings_version = '';
    if (this.props.asset.summary && this.props.asset.summary.settings_version) {
      settings_version = this.props.asset.summary.settings_version;
    }

    let downloads: AssetDownloads = [];
    if (this.props.asset.asset_type !== ASSET_TYPES.collection.id) {
      downloads = this.props.asset.downloads.filter(dl => dl.format === 'xls');
    }

    // const userCanEdit = userWithSameSubdomainAsAssetOwner(this.props.asset);
    const userCanEdit = true;

    return (
      <bem.AssetsTableRow m={['asset', `type-${this.props.asset.asset_type}`]}>
        {this.props.asset.asset_type === ASSET_TYPES.collection.id &&
          <bem.AssetsTableRow__link href={`#/library/asset/${this.props.asset.uid}`}/>
        }
        {this.props.asset.asset_type !== ASSET_TYPES.collection.id &&
          <bem.AssetsTableRow__link href={`#/library/asset/${this.props.asset.uid}/edit`}/>
        }

        <bem.AssetsTableRow__column m='name'>
          {rowCount !== null &&
            <bem.AssetsTableRow__tag m='gray-circle row-count'>{rowCount}</bem.AssetsTableRow__tag>
          }

          <AssetName asset={this.props.asset}/>

          {this.props.asset.settings && this.props.asset.tag_string && this.props.asset.tag_string.length > 0 && this.props.showTag &&
>>>>>>> /tmp/kpiport/mf/fork
            <bem.AssetsTableRow__tags>
              {this.props.asset.tag_string
                .split(',')
                .map((tag) => [' ', <bem.AssetsTableRow__tag key={tag}>{tag}</bem.AssetsTableRow__tag>])}
            </bem.AssetsTableRow__tags>
          )}
        </bem.AssetsTableRow__column>

<<<<<<< /tmp/kpiport/mf/cur
        <bem.AssetsTableRow__column m='item-count'>
          {rowCount !== null && <bem.AssetsTableRow__tag m='gray-circle'>{rowCount}</bem.AssetsTableRow__tag>}
=======
        <bem.AssetsTableRow__column m='item-version'>
          {settings_version}
        </bem.AssetsTableRow__column>

        <bem.AssetsTableRow__column m='item-type' className='capitalize'>
          {ASSET_TYPES[this.props.asset.asset_type].label}
>>>>>>> /tmp/kpiport/mf/fork
        </bem.AssetsTableRow__column>

        <bem.AssetsTableRow__column m='owner'>
          {assetUtils.getAssetOwnerDisplayName(this.props.asset.owner_label)}
        </bem.AssetsTableRow__column>

<<<<<<< /tmp/kpiport/mf/cur
        {this.props.context === ASSETS_TABLE_CONTEXTS.PUBLIC_COLLECTIONS && (
          <bem.AssetsTableRow__column m='subscribers-count'>
            {this.props.asset.subscribers_count}
          </bem.AssetsTableRow__column>
        )}

        <bem.AssetsTableRow__column m='languages'>
          {assetUtils.getLanguagesDisplayString(this.props.asset)}
        </bem.AssetsTableRow__column>

        {this.props.context === ASSETS_TABLE_CONTEXTS.PUBLIC_COLLECTIONS && (
          <bem.AssetsTableRow__column m='primary-sector'>
            {assetUtils.getSectorDisplayString(this.props.asset)}
          </bem.AssetsTableRow__column>
        )}
=======
        <bem.AssetsTableRow__column m='date-modified'>
          {formatTime(this.props.asset.date_modified)}
        </bem.AssetsTableRow__column>

        <bem.AssetsTableRow__column
          m='actions'
          className={this.props.asset.asset_type === ASSET_TYPES.collection.id ? '' : 'with-actions-buttons' }
        >

          <bem.AssetActionButtons>

            {userCanEdit && this.props.asset.asset_type !== ASSET_TYPES.collection.id && (
              <bem.AssetActionButtons__iconButton
                href={`#/library/asset/${this.props.asset.uid}/edit`}
                data-tip={t('Edit')}
                className='right-tooltip'
              >
                <i className='k-icon k-icon-edit' />
              </bem.AssetActionButtons__iconButton>
            )}

            {userCanEdit && this.props.asset.asset_type === ASSET_TYPES.collection.id && (
              <bem.AssetActionButtons__iconButton
                onClick={this.modifyDetails}
                data-tip={t('Rename Collection')}
                className='right-tooltip'
              >
                <i className='k-icon k-icon-edit' />
              </bem.AssetActionButtons__iconButton>
            )}

            {userCanEdit && (
              <bem.AssetActionButtons__iconButton
                onClick={this.showTagsModal}
                data-tip={t('Labels')}
                className='right-tooltip'
              >
                <i className='k-icon k-icon-tag' />
              </bem.AssetActionButtons__iconButton>
            )}

            {this.props.asset.asset_type !== ASSET_TYPES.collection.id && (
              <bem.AssetActionButtons__iconButton
                onClick={this.clone}
                data-tip={t('Clone')}
                className='right-tooltip'
              >
                <i className='k-icon k-icon-duplicate' />
              </bem.AssetActionButtons__iconButton>
            )}

            {downloads.map((dl) => (
              <bem.AssetActionButtons__iconButton
                href={dl.url}
                data-tip={`${t('Download')} ${dl.format.toString().toUpperCase()}`}
                key={`dl-${dl.format}`}>
                <i className={`k-icon k-icon-file-${dl.format}`} />
              </bem.AssetActionButtons__iconButton>
            ))}

            { this.props.asset.asset_type !== ASSET_TYPES.collection.id && (
              <AssetCollectionActions asset={this.props.asset} />
            )}

            {userCanEdit && (
              <bem.AssetActionButtons__iconButton
                data-tip={t('Delete')}
                onClick={this.delete}>
                <i className='k-icon k-icon-trash' />
              </bem.AssetActionButtons__iconButton>
            )}

          </bem.AssetActionButtons>
>>>>>>> /tmp/kpiport/mf/fork

        </bem.AssetsTableRow__column>

      </bem.AssetsTableRow>
    )
  }
}

export default AssetsTableRow
