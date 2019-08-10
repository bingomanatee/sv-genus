import React, {Component, PureComponent} from 'react'
import { withSize } from 'react-sizeme'
const withSizeHOC = withSize({
  refreshRate:32,
  refreshMode: 'debounce'
});

import {render} from 'react-dom'
import _ from 'lodash';

import SvGenus from '../../src'

import sourceSVGs from './buttons.json';

const TILE_NAMES = 'button-default,button-disabled,button-down,button-hover'.split(',');

const button = async (SvGenus) => {
  return withSizeHOC(SvGenus.defineComponent({
    sourceSVGs,
    reactClassName: 'Button',
    extractor(elements) {
      TILE_NAMES
        .forEach(name => {
          if (!elements.has(name)) {
            return;
          }
          const {svg} = elements.get(name);
          const background = svg.querySelector('#' + name);
          const label = svg.querySelector('#button-label');
          if (label) {
            elements.set(name + '-label-style', SvGenus.textToStyle(label));
            background.removeChild(label);
          }

          while (svg.firstElementChild.firstElementChild) {
            svg.firstElementChild.removeChild(svg.firstElementChild.firstElementChild)
          }
          for (let i = 0; i < background.children.length; ++i)
            svg.firstElementChild.appendChild(background.children[i]);
          const tree = SvGenus.svgToTree({element: svg, isDocument: true});
          const treeName = name + '-tree';
          console.log('----- got tree: ', treeName, 'tree:', tree);
          elements.set(treeName, tree)
        })
    },
    compiler({elements, SvGenus}) {
      const defaultTree = elements.get('button-default-tree');
      const buttonStyle = {
        background: 'none',
        color: 'inherit',
        border: 'none',
        font: 'inherit',
        cursor: 'pointer',
        outline: 'inherit',
        'WebkitAppearance': 'none',
        'MozAppearance': 'none',
        appearance: 'none',
      };

      const resize = (bg, width) => {
        bg = _.cloneDeep(bg);
        SvGenus.setSvgWidth(bg, width, 'object');
        const rect = _.get(bg, 'svgChildren[0].svgChildren[0]');
        if (rect && rect.svgTag === 'rect') {
          rect.viewProps.width = width;
        }
        return bg;
      };

      return class Button extends PureComponent {
        constructor(props) {
          super(props);
          this.textRef = React.createRef();
          this.state = {
            width: null,
            buttonState: 'default',
            suffix: '',
          };
        }

        updateWidth() {
          const current = this.textRef.current;
          if (!current) {
            return;
          }
          const width = current.clientWidth;
          if (width !== this.state.width) {
            this.setState({width});
          }
        }

        componentDidMount() {
          this.updateWidth();
          setInterval(() => this.setState(({suffix}) => ({
            suffix: (suffix +
              '.')
          })), 500)
        }

        componentDidUpdate() {
          this.updateWidth();
        }

        currentBG() {
          const {buttonState, width} = this.state;
          const key = 'button-' + buttonState + '-tree';
          let bg = elements.get(key) || defaultTree;
          if (width) {
            bg = resize(bg, width);
            console.log('new width background: ', width, bg);
          } else {
            console.log('no width');
          }
          return SvGenus.svgToBackground(bg, 'object');
        }

        currentLabelStyle() {
          const {buttonState} = this.state;
          return elements.get(buttonState + '-label-style') || {};
        }

        setButtonState(buttonState) {
          this.setState({buttonState});
        }

        render() {
          const {children} = this.props;
          const {suffix} = this.state;
          console.log('button children:', children);
          let background = this.currentBG();
          const labelStyle = this.currentLabelStyle();
          return <button
            onMouseEnter={() => this.setButtonState('hover')}
            onMouseLeave={() => this.setButtonState('default')}
            onMouseDown={() => this.setButtonState('down')}
            onMouseUp={() => this.setButtonState('hover')}
            ref={this.textRef} style={({
            ...buttonStyle, ...labelStyle, background,
            height: defaultTree.viewProps.height
          })}>
            {children} {suffix}
          </button>
        }
      }
    }
  }))
}


class Demo extends Component {
  constructor(props) {
    super(props);
    this.state = {Button: false};
  }

  componentDidMount() {
    button(SvGenus)
      .then(() => {
        if (SvGenus.Button) {
          this.setState({Button: SvGenus.Button});
        }
      })
  }

  render() {
    const {Button} = this.state;
    return <div>
      <h1>sv-genus Demo</h1>
      <div style={({border: '1px solid red'})}>
        {Button ? <Button>Button Example</Button> : '... loading button'}
      </div>
    </div>
  }
}

render(<Demo/>, document.querySelector('#demo'))
