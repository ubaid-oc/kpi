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
import myLibraryStore from './myLibraryStore';
import ownedCollectionsStore from 'js/components/library/ownedCollectionsStore';
import { routerIsActive, withRouter } from '../../router/legacy';
import {ROUTES} from 'js/router/routerConstants';
import {NavLink} from 'react-router-dom';
import Dropzone from 'react-dropzone';
import {validFileTypes} from 'utils';

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
    };
    autoBind(this);
  }

  componentDidMount() {
    this.listenTo(myLibraryStore, this.myLibraryStoreChanged);
    this.setState({
      isLoading: false,
      myLibraryCount: myLibraryStore.getCurrentUserTotalAssets()
    });
  }

  goToBlockCreator() {
    let targetPath = ROUTES.NEW_LIBRARY_ITEM;
    if (this.isLibrarySingle()) {
      const found = ownedCollectionsStore.find(this.currentAssetID());
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
    if (this.isLibrarySingle()) {
      const found = ownedCollectionsStore.find(this.currentAssetID());
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
      type: MODAL_TYPES.LIBRARY_COLLECTION,
    });
  }

  myLibraryStoreChanged() {
    this.setState({
      isLoading: false,
      myLibraryCount: myLibraryStore.getCurrentUserTotalAssets()
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
            {t('Question Block')}
          </bem.PopoverMenu__item>
          <bem.PopoverMenu__item onClick={this.goToTemplateCreator}>
            {t('Template')}
          </bem.PopoverMenu__item>
          <Dropzone
            onDrop={this.onFileDrop.bind(this)}
            multiple={false}
            className='dropzone'
            accept={validFileTypes()}
          >
            <bem.PopoverMenu__link>
              {t('Upload')}
            </bem.PopoverMenu__link>
          </Dropzone>
          <bem.PopoverMenu__item onClick={this.goToCollectionCreator}>
            {t('Collection')}
          </bem.PopoverMenu__item>
        </PopoverMenu>

        <bem.FormSidebar m={sidebarModifier}>
          <NavLink
            className='form-sidebar__navlink'
            to='/library/my-library'
          >
            <bem.FormSidebar__label
              m={{selected: this.isMyLibrarySelected()}}
            >
              <i className='k-icon k-icon-library'/>
              <bem.FormSidebar__labelText>{t('Library')}</bem.FormSidebar__labelText>
              <bem.FormSidebar__labelCount>{this.state.myLibraryCount}</bem.FormSidebar__labelCount>
            </bem.FormSidebar__label>
          </NavLink>

          {/* <NavLink
            className='form-sidebar__navlink'
            to='/library/public-collections'
          >
            <bem.FormSidebar__label
              m={{selected: this.isPublicCollectionsSelected()}}
            >
              <i className='k-icon k-icon-library-public'/>
              <bem.FormSidebar__labelText>{t('Public Collections')}</bem.FormSidebar__labelText>
            </bem.FormSidebar__label>
          </NavLink> */}
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
