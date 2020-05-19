import { ComponentType } from 'react';

import {
  AnyExtension,
  AnyPreset,
  Extension,
  ExtensionCommandReturn,
  ExtensionFactory,
  ExtensionHelperReturn,
  object,
  Shape,
} from '@remirror/core';

import { DEFAULT_TRANSFORMATIONS, SSRTransformer } from './react-ssr-helpers';

interface ReactSSRExtensionSettings {
  /**
   * The transformers that will be automatically used in the editor for properly
   * rendering ssr.
   *
   * @defaultValue `DEFAULT_TRANSFORMATIONS`
   */
  transformers?: SSRTransformer[];
}
/**
 * This extension allows for React based SSR transformations to the editor. It
 * adds a parameter option called `createSSRTransformer` which is used to handle
 * the differences between how prosemirror renders the dom and how it appears in
 * an ssr environment.
 *
 * @remarks
 *
 * There are subtle things that prosemirror does when it loads the document that
 * can cause things to jump around.
 *
 * The aim of this extension is to provide a series of helper transformations
 * which deal with the typical problems that prosemirror presents when rendering
 * on the server. It also allows other extensions to use the
 * `createSSRTransformer` option to handle their own ssr discrepancies.
 *
 * The transformations can also serve as a guideline when creating your own
 * SSRTransforms. However in most cases the defaults should be sufficient.
 */
const ReactSSRExtension = ExtensionFactory.typed<ReactSSRExtensionSettings>().plain({
  name: 'reactSSR',
  defaultSettings: { transformers: DEFAULT_TRANSFORMATIONS },

  onCreate(parameter) {
    const { setStoreKey } = parameter;

    return {
      afterExtensionLoop() {
        setStoreKey('components', object());
        setStoreKey('componentOptions', object());
      },
    };
  },

  /**
   * Ensure that all ssr transformers are run.
   */
  onInitialize: ({ getParameter, setStoreKey }) => {
    const ssrTransformers: SSRTransformer[] = [];

    const ssrTransformer: SSRTransformer = (initialElement) => {
      let element: JSX.Element = initialElement;

      for (const transformer of ssrTransformers) {
        element = transformer(element);
      }

      return element;
    };

    return {
      forEachExtension: (extension) => {
        if (!extension.parameter.createSSRTransformer || extension.settings.exclude.reactSSR) {
          return;
        }

        const parameter = getParameter(extension);
        ssrTransformers.push(extension.parameter.createSSRTransformer(parameter));
      },

      afterExtensionLoop: () => {
        setStoreKey('ssrTransformer', ssrTransformer);
      },
    };
  },

  /**
   * Transform all the transformers.
   */
  createSSRTransformer: ({ extension }) => (initialElement) => {
    let element: JSX.Element = initialElement;

    for (const transformer of extension.settings.transformers) {
      element = transformer(element);
    }

    return element;
  },
});

declare global {
  namespace Remirror {
    interface ExcludeOptions {
      /**
       * Whether to use the SSR component when not in a DOM environment
       *
       * @defaultValue `undefined`
       */
      reactSSR?: boolean;
    }

    interface ManagerStore<ExtensionUnion extends AnyExtension, PresetUnion extends AnyPreset> {
      /**
       * The transformer for updating the SSR rendering of the prosemirror state
       * and allowing it to render without defects.
       */
      ssrTransformer: SSRTransformer;

      /**
       * Components for ssr transformations.
       */
      components: Record<string, ComponentType<any>>;

      /**
       * The options for each component
       */
      componentOptions: Record<string, any>;
    }

    interface ExtensionCreatorMethods<Settings extends Shape = {}, Properties extends Shape = {}> {
      /**
       * A method for transforming the SSR JSX received by the extension. Some
       * extensions add decorations to the ProsemirrorView based on their state.
       * These decorations can touch any node or mark and it would be very
       * difficult to model this without being able to take the completed JSX
       * render and transforming it some way.
       *
       * @remarks
       *
       * An example use case is for placeholders which need to render a
       * `data-placeholder` and `class` attribute so that the placeholder is
       * shown by the styles. This method can be called to check if there is
       * only one child of the parent
       */
      createSSRTransformer?: (
        parameter: ManagerMethodParameter & {
          extension: Extension<Name, Settings, Properties, Commands, Helpers, ProsemirrorType>;
        },
      ) => SSRTransformer;
    }
  }
}

export type { ReactSSRExtensionSettings };
export { ReactSSRExtension };
