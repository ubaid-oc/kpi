import React from 'react';
import Reflux from 'reflux';
import reactMixin from 'react-mixin';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import {stores} from 'js/stores';
import sessionStore from 'js/stores/session';
import bem from 'js/bem';
import mixins from 'js/mixins';
import PopoverMenu from 'js/popoverMenu';
import {MODAL_TYPES, ASSET_TYPES} from 'js/constants';
import assetUtils from 'js/assetUtils';
import myLibraryStore from './myLibraryStore';
import ownedCollectionsStore from 'js/components/library/ownedCollectionsStore';
import { routerIsActive, withRouter } from '../../router/legacy';
import {ROUTES} from 'js/router/routerConstants';
import {NavLink} from 'react-router-dom';
import Dropzone from 'react-dropzone';
import {validFileTypes} from 'utils';
import './librarySidebar.scss';

const assetActions = mixins.clickAssets.click.asset;

const TEMPLATE_TYPE = {
    value: ASSET_TYPES.template.id,
    label: ASSET_TYPES.template.label,
  };

class LibrarySidebar extends Reflux.Component {
  constructor(props){
    super(props);
    this.state = {
      myLibraryCount: 0,
      // default is template
      desiredType: TEMPLATE_TYPE,
      sidebarCollections: [],
    };
    autoBind(this);
  }

  componentDidMount() {
    this.listenTo(myLibraryStore, this.myLibraryStoreChanged);
    this.listenTo(ownedCollectionsStore, this.ownedCollectionsStoreChanged);
    this.setState({
      isLoading: false,
      myLibraryCount: myLibraryStore.getCurrentUserTotalAssets(),
      sidebarCollections: ownedCollectionsStore.getCollections(),
    });
  }

  goToBlockCreator() {
    let targetPath = ROUTES.NEW_LIBRARY_ITEM;
    const currentCollectionUid = myLibraryStore.getCollectionUid();
    if (currentCollectionUid) {
      const found = ownedCollectionsStore.find(currentCollectionUid);
      if (found && found.asset_type === ASSET_TYPES.collection.id) {
        // when creating from within a collection page, make the new asset
        // a child of this collection
        targetPath = ROUTES.NEW_LIBRARY_CHILD.replace(':uid', found.uid);
      }
    }

    this.props.router.navigate(targetPath);
  }

  goToTemplateCreator() {
    let targetPath = ROUTES.NEW_LIBRARY_TEMPLATE_ITEM;
    const currentCollectionUid = myLibraryStore.getCollectionUid();
    if (currentCollectionUid) {
      const found = ownedCollectionsStore.find(currentCollectionUid);
      if (found && found.asset_type === ASSET_TYPES.collection.id) {
        // when creating from within a collection page, make the new asset
        // a child of this collection
        targetPath = ROUTES.NEW_LIBRARY_TEMPLATE_ITEM_CHILD.replace(':uid', found.uid);
      }
    }
    this.props.router.navigate(targetPath);
  }

  onFileDrop(files) {
    if (files[0]) {
      this.dropFiles(
        [files[0]],
        [],
        {},
        {desired_type: TEMPLATE_TYPE.value}
      );
    }
  }

  goToCollectionCreator(evt) {
    evt.preventDefault();

    stores.pageState.showModal({
      type: MODAL_TYPES.LIBRARY_COLLECTION_CREATE,
    });
  }

  myLibraryStoreChanged() {
    this.setState({
      isLoading: false,
      myLibraryCount: myLibraryStore.getCurrentUserTotalAssets(),
    });
  }

  ownedCollectionsStoreChanged() {
    this.setState({
      isLoading: false,
      sidebarCollections: ownedCollectionsStore.getCollections(),
    });
  }

  showLibraryNewModal(evt) {
    evt.preventDefault();
    stores.pageState.showModal({
      type: MODAL_TYPES.LIBRARY_NEW_ITEM
    });
  }

  isMyLibrarySelected() {
    return routerIsActive('library/my-library');
  }

  isPublicCollectionsSelected() {
    return routerIsActive('library/public-collections');
  }

  renameCollection(collection) {
    assetUtils.modifyDetails(collection);
  }

  deleteCollection(collection) {
    assetActions.delete(
      collection,
      assetUtils.getAssetDisplayName(collection).final,
      this.onDeleteComplete.bind(this)
    );
  }

  onDeleteComplete() {
    // do nothing
  }

  clickFilterByCollection(evt) {
    evt.preventDefault();
    const collectionUid = evt.currentTarget.getAttribute('data-collection-uid');

    myLibraryStore.setCollectionUid(collectionUid);
  }

  clickWithoutCollectionFilter(evt) {
    evt.preventDefault();
    myLibraryStore.clearCollectionUid();
  }

  render() {
    let sidebarModifier = '';
    if (this.state.isLoading) {
      sidebarModifier = 'loading';
    }

    return (
      <React.Fragment>
        <PopoverMenu
          type='new-menu'
          disabled={!sessionStore.isLoggedIn}
          triggerLabel={t('new')}
        >
          <bem.PopoverMenu__item onClick={this.goToBlockCreator}>
            <i className='k-icon-question' />
            {t('Question')}
          </bem.PopoverMenu__item>
          <bem.PopoverMenu__item onClick={this.goToTemplateCreator}>
            <i className='k-icon-template' />
            {t('Template')}
          </bem.PopoverMenu__item>
          <Dropzone
            onDrop={this.onFileDrop.bind(this)}
            multiple={false}
            className='dropzone'
            accept={validFileTypes()}
          >
            <bem.PopoverMenu__link>
              <i className='k-icon-upload' />
              {t('Upload')}
            </bem.PopoverMenu__link>
          </Dropzone>
          <bem.PopoverMenu__item onClick={this.goToCollectionCreator}>
            <i className='k-icon-folder' />
            {t('Collection')}
          </bem.PopoverMenu__item>
        </PopoverMenu>

        <bem.FormSidebar m={sidebarModifier}>

          <bem.FormSidebar__label
            m={{selected: this.isMyLibrarySelected()}}
            onClick={this.clickWithoutCollectionFilter}
          >
            <i className='k-icon k-icon-library'/>
            <bem.FormSidebar__labelText>{t('Library')}</bem.FormSidebar__labelText>
            <bem.FormSidebar__labelCount>{this.state.myLibraryCount}</bem.FormSidebar__labelCount>
          </bem.FormSidebar__label>

          { this.state.sidebarCollections &&
            <bem.FormSidebar__grouping>
              { this.state.sidebarCollections.map((collection) => (
                  <bem.FormSidebar__item
                    key={collection.uid}
                    m={{
                      collection: true,
                      selected:
                        myLibraryStore.getCollectionUid() ===
                          collection.uid,
                    }}>
                    <bem.FormSidebar__itemlink
                      onClick={this.clickFilterByCollection}
                      data-collection-uid={collection.uid}
                      data-collection-name={collection.name}>
                      <i className='k-icon-folder' />
                      {collection.name}
                    </bem.FormSidebar__itemlink>
                    { myLibraryStore.getCollectionUid() === collection.uid &&
                      <PopoverMenu type='collectionSidebarPublic-menu'
                            triggerLabel={<i className='k-icon-more' />}>
                        <bem.PopoverMenu__link
                            m={'rename'}
                            onClick={() => this.renameCollection(collection)}
                            data-collection-uid={collection.uid}
                            data-collection-name={collection.name}
                            >
                          <i className='k-icon-edit' />
                          {t('Rename')}
                        </bem.PopoverMenu__link>
                        <bem.PopoverMenu__link
                            m={'delete'}
                            onClick={() => this.deleteCollection(collection)}
                            data-collection-uid={collection.uid}
                            >
                          <i className='k-icon-trash' />
                          {t('Delete')}
                        </bem.PopoverMenu__link>
                      </PopoverMenu>
                    }
                  </bem.FormSidebar__item>
                ))
              }
            </bem.FormSidebar__grouping>
          }
        </bem.FormSidebar>
      </React.Fragment>
    );
  }
}

LibrarySidebar.contextTypes = {
  router: PropTypes.object
};

reactMixin(LibrarySidebar.prototype, Reflux.ListenerMixin);
reactMixin(LibrarySidebar.prototype, mixins.contextRouter);
reactMixin(LibrarySidebar.prototype, mixins.droppable);

export default withRouter(LibrarySidebar);
