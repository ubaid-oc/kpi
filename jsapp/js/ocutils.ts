/**
 * A collection of openclinica utility functions.
 */

import moment from 'moment';
import _ from 'underscore';
import { CrossStorageClient } from 'cross-storage';

let crossStorageClient: CrossStorageClient;
let crossStorageCheckIntervalID: number;

const CROSS_STORAGE_TIMEOUT_KEY = 'OCAppTimeout';
const CROSS_STORAGE_USER_KEY = 'currentUser';
const CROSS_STORAGE_CHECK_INTERVAL = 60*1000; // 1min
const CROSS_STORAGE_IDLE_LOGOUT_TIME = 60*60; // 1hr

export function initCrossStorageClient() {
  const crossStorageHub = window.location.origin.replace('formdesigner', 'build') + '/hub/hub.html';
  crossStorageClient = new CrossStorageClient(crossStorageHub, {
    timeout: 4000,
  });
}

export function getCrossStorageClient() {
  if (!crossStorageClient) {
    initCrossStorageClient();
  }
  return crossStorageClient;
}

export async function updateCrossStorageTimeOut(): Promise<string> {
  await crossStorageClient.onConnect();
  const newTimeoutMoment = moment().add(CROSS_STORAGE_IDLE_LOGOUT_TIME, 's');
  crossStorageClient.set(CROSS_STORAGE_TIMEOUT_KEY, newTimeoutMoment.valueOf());
  return 'updateCrossStorageTimeOut-success';
}

export async function checkCrossStorageUser(userName: string): Promise<string|void> {
  return crossStorageClient.onConnect().then(async () => {
    let userValue = await crossStorageClient.get(CROSS_STORAGE_USER_KEY);
    userValue = userValue.trim();
    if (_.isEmpty(userValue)) {
      console.log('checkCrossStorageUser userValue null');
      throw 'logout';
    } else if (userValue.toLowerCase() !== userName.toLowerCase()) {
      console.log('checkCrossStorageUser userValue different');
      throw 'user-changed';
    }
    console.log('checkCrossStorageUser-success', userValue);
    return 'checkCrossStorageUser-success';
  }).catch((err: any) => {
    // Handle error
    console.log('checkCrossStorageUser crossStorageClient err', err);
    throw err;
  });

}

export async function checkCrossStorageTimeOut(): Promise<string|void> {
  return crossStorageClient.onConnect().then(async () => {
    let timeOutValue = await crossStorageClient.get(CROSS_STORAGE_TIMEOUT_KEY);
    if (timeOutValue === null) {
      console.log('checkCrossStorageTimeOut timeOutValue null');
      throw 'logout';
    }
    const currentMoment = moment();
    const timeoutMoment = moment(parseInt(timeOutValue, 10));
    if (currentMoment.isAfter(timeoutMoment)) {
      console.log('checkCrossStorageTimeOut timeOutValue isAfter');
      throw 'logout';
    } else {
      console.log('checkCrossStorageTimeOut-success', timeoutMoment);
      return 'checkCrossStorageTimeOut-success';
    }
  }).catch((err: any) => {
    // Handle error
    console.log('checkCrossStorageTimeOut crossStorageClient err', err);
    throw err;
  });
}

export function setPeriodicCrossStorageCheck(checkFunction: TimerHandler) {
  crossStorageCheckIntervalID = setInterval(checkFunction, CROSS_STORAGE_CHECK_INTERVAL);
}

export function addCustomEventListener(selector: string, event: any, handler: (arg0: any) => void) {
  if (selector == 'body') {
    document.body.addEventListener(event, function(evt) {
      handler(evt);
      return;
    }, true);
  } else {
    let rootElement: any = document.querySelector('body');
    rootElement.addEventListener(event, function (evt: { target: any; }) {
      let targetElement = evt.target;
      let targetFound = false;
      while (targetElement != null && !targetFound) {
        if (targetElement.matches(selector)) {
          handler(evt);
          targetFound = true;
          return;
        }
        targetElement = targetElement.parentElement;
      }
    }, true);
  }
}

export function processArrayMiddleOut(array: any[], startIndex: number, direction: string){
  if (startIndex < 0){
      startIndex = 0;
  }
  else if ( startIndex > array.length){
      startIndex = array.length - 1;
  };

  let newArray = [];
  let i = startIndex;
  let j = 0;

  if (direction === 'right'){
      j = i + 1;
      while (j < array.length || i >= 0 ){
          if (i >= 0) newArray.push(array[i]);
          if (j < array.length) newArray.push(array[j]);
          i--;
          j++;
      };
  }
  else if(direction === 'left'){
      j = i - 1;
      while (j >= 0 || i < array.length ){
          if (i < array.length) newArray.push(array[i]);
          if (j >= 0) newArray.push(array[j]);
          i++;
          j--;
      };
  };

  return newArray;
}

export function getLibraryFilterCacheName() {
  return 'kpi.library.filter-style';
}
