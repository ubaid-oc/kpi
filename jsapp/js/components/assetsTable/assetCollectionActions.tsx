import React from 'react';
import autoBind from 'react-autobind';
import _ from 'lodash';
import PopoverMenu from 'js/popoverMenu';
import bem, {makeBem} from 'js/bem';
import {actions} from 'js/actions';
import assetUtils from 'js/assetUtils';
import {ASSET_TYPES} from 'js/constants';
import type {AssetResponse} from 'js/dataInterface';
import ownedCollectionsStore from 'js/components/library/ownedCollectionsStore';
import type {OwnedCollectionsStoreData} from 'js/components/library/ownedCollectionsStore';
import {withRouter} from 'jsapp/js/router/legacy';
import type {WithRouterProps} from 'jsapp/js/router/legacy';
import {userCan} from 'js/components/permissions/utils';
import './assetCollectionActions.scss';

bem.AssetCollectionActions = makeBem(null, 'asset-collection-actions', 'menu');

interface AssetCollectionActionsProps extends WithRouterProps {
  asset: AssetResponse;
}

interface AssetCollectionActionsState {
  ownedCollections: AssetResponse[];
  shouldHidePopover: boolean;
  isPopoverVisible: boolean;
}

class AssetCollectionActions extends React.Component<
  AssetCollectionActionsProps,
  AssetCollectionActionsState
> {
  private unlisteners: Function[] = [];
  hidePopoverDebounced = _.debounce(() => {
    if (this.state.isPopoverVisible) {
      this.setState({shouldHidePopover: true});
    }
  }, 500);

  constructor(props: AssetCollectionActionsProps) {
    super(props);
    this.state = {
      ownedCollections: ownedCollectionsStore.data.collections,
      shouldHidePopover: false,
      isPopoverVisible: false,
    };
    autoBind(this);
  }

  componentDidMount() {
    ownedCollectionsStore.listen(
      this.onOwnedCollectionsStoreChanged.bind(this),
      this
    );
  }

  componentWillUnmount() {
    this.unlisteners.forEach((clb) => {
      clb();
    });
  }

  onOwnedCollectionsStoreChanged(storeData: OwnedCollectionsStoreData) {
    this.setState({ownedCollections: storeData.collections});
  }

  onPopoverSetVisible() {
    this.setState({isPopoverVisible: true});
  }

  /** Pass `null` to remove from collection. */
  moveToCollection(collectionUrl: string | null) {
    actions.library.moveToCollection(this.props.asset.uid, collectionUrl);
  }

  renderTrigger() {
    return (
      <div className='right-tooltip' data-tip={t('Manage collection')}>
        <i className='k-icon k-icon-folder' />
      </div>
    );
  }

  render() {
    if (!this.props.asset) {
      return null;
    }

    const assetType = this.props.asset.asset_type;
    const isCollection = assetType === ASSET_TYPES.collection.id;
    const userCanEdit = userCan('change_asset', this.props.asset);

    return (
      <bem.AssetCollectionActions>
        {!isCollection &&
          <PopoverMenu
            triggerLabel={this.renderTrigger()}
            clearPopover={this.state.shouldHidePopover}
            popoverSetVisible={this.onPopoverSetVisible}
          >
            {userCanEdit &&
            assetType !== ASSET_TYPES.survey.id &&
            assetType !== ASSET_TYPES.collection.id &&
            this.props.asset.parent !== null && (
              <bem.PopoverMenu__link
                onClick={this.moveToCollection.bind(this, null)}
              >
                <i className='k-icon k-icon-folder-out' />
                {t('Remove from collection')}
              </bem.PopoverMenu__link>
            )}

            {userCanEdit &&
              assetType !== ASSET_TYPES.survey.id &&
              assetType !== ASSET_TYPES.collection.id &&
              this.state.ownedCollections.length > 0 && [
                <bem.PopoverMenu__heading key='heading'>
                  {t('Move to')}
                </bem.PopoverMenu__heading>,
                <bem.PopoverMenu__moveTo key='list'>
                  {this.state.ownedCollections.map((collection) => {
                    const modifiers = ['move-coll-item'];
                    const isAssetParent =
                      collection.url === this.props.asset.parent;
                    if (isAssetParent) {
                      modifiers.push('move-coll-item-parent');
                    }
                    const displayName =
                      assetUtils.getAssetDisplayName(collection).final;
                    return (
                      <bem.PopoverMenu__item
                        onClick={this.moveToCollection.bind(this, collection.url)}
                        key={collection.uid}
                        title={displayName}
                        m={modifiers}
                      >
                        {isAssetParent && <i className='k-icon k-icon-check' />}
                        {!isAssetParent && (
                          <i className='k-icon k-icon-folder-in' />
                        )}
                        {displayName}
                      </bem.PopoverMenu__item>
                    );
                  })}
                </bem.PopoverMenu__moveTo>,
            ]}
          </PopoverMenu>
        }
      </bem.AssetCollectionActions>
    );
  }
}

export default withRouter(AssetCollectionActions);
