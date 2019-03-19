import * as cache from '../common/helpers/type-cache';

export const EventTypes = {
    WRITE_DOC: cache.type('WRITE_DOC'),
    REMOVE_ITEM_FROM_CACHE: cache.type('REMOVE_ITEM_FROM_CACHE'),
    ADD_ITEM_TO_CACHE_IF_NOT_PRESENT: cache.type('ADD_ITEM_TO_CACHE_IF_NOT_PRESENT'),
    ADD_ITEM_TO_CACHE_IF_NOT_PRESENT_ANSWER: cache.type('ADD_ITEM_TO_CACHE_IF_NOT_PRESENT_ANSWER'),
};

