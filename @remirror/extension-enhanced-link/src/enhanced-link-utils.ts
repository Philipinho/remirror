import { TextSelection } from 'prosemirror-state';

import {
  EditorState,
  EditorStateParameter,
  FromToParameter,
  Mark,
  MarkTypeParameter,
  TransactionParameter,
} from '@remirror/core';

export const extractHref = (url: string) =>
  url.startsWith('http') || url.startsWith('//') ? url : `http://${url}`;

export interface EnhancedLinkHandlerProps
  extends EditorStateParameter,
    FromToParameter,
    Partial<TransactionParameter>,
    MarkTypeParameter {
  /**
   * The url to add as a mark to the range provided.
   */
  url: string;
}

/**
 * Add the provided URL as a mark to the text range provided
 */
export const enhancedLinkHandler = ({
  state,
  url,
  from,
  to,
  tr,
  type,
}: EnhancedLinkHandlerProps) => {
  const endPosition = state.selection.to;
  const enhancedLink = type.create({ href: extractHref(url) });

  tr = (tr ?? state.tr).replaceWith(from, to, state.schema.text(url, [enhancedLink]));

  // Ensure that the selection doesn't jump when the the current selection is within the range
  if (endPosition < to) {
    return tr.setSelection(TextSelection.create(tr.doc, endPosition));
  }

  return tr;
};

/**
 * Retrieves all the automatically applied URLs from the state.
 */
export const getUrlsFromState = (state: EditorState, markName: string) => {
  const $pos = state.doc.resolve(0);
  let marks: Mark[] = [];

  state.doc.nodesBetween($pos.start(), $pos.end(), (node) => {
    marks = [...marks, ...node.marks];
  });

  const urls = marks
    .filter((markItem) => markItem.type.name === markName)
    .map((mark) => mark.attrs.href);

  return { set: new Set(urls), urls };
};

/**
 * Checks whether two sets are equal
 * @param setOne
 * @param setTwo
 */
export const isSetEqual = <GSetType>(setOne: Set<GSetType>, setTwo: Set<GSetType>) => {
  if (setOne.size !== setTwo.size) {
    return false;
  }

  for (const value of setOne) {
    if (!setTwo.has(value)) {
      return false;
    }
  }

  return true;
};
