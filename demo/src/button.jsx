import React, {PureComponent} from 'react';
import sourceSVGs from './buttons.json';

export default async (SvGenus) => {
  return SvGenus.defineComponent({
    sourceSVGs,
    extractor(elementMap) {
      'button-default,button-disabled,button-down,button-hoer'.split(',')
        .forEach(name => {
          if (!elementMap.has(name)) {
            return;
          }
          const data = elementMap.get(name);

          console.log('processing svg ', name, ': ', data);
        })
    },
    compiler({elements, svgFns, SvGenus}) {
      return class extends PureComponent {
        render() {
          const {children} = this.props;
          return <button>{children}</button>;
        }
      }
    }
  })
}
