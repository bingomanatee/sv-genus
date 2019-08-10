import React, {Component, PureComponent} from 'react'
import {withSize} from 'react-sizeme'

const withSizeHOC = withSize({
  refreshRate: 20,
  refreshMode: 'debounce'
});

import {render} from 'react-dom'
import _ from 'lodash';

import SvGenus from '../../src'

import sourceSVGs from './buttons.json';

const TILE_NAMES = 'button-default,button-disabled,button-down,button-hover'.split(',');

const button = async (SvGenus) => {
  return SvGenus.defineComponent({
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
        backgroundRepeat: 'no-repeat'
      };

      function getRect(n) {
        if (n.svgTag === 'rect') return n;
        return n.svgChildren.reduce((r, n2) => {
          if (r) return r;
          return getRect(n2);
        }, false)
      }

      const resize = (bg, width) => {
        bg = _.cloneDeep(bg);
        SvGenus.setSvgWidth(bg, width, 'object');
        const rect = getRect(bg);
        if (rect && rect.svgTag === 'rect') {
          rect.viewProps.width = width - 1;
        } else {
          console.log('----------- cannot find rect in ', bg, 'found ', rect);
        }
        return bg;
      };

      return withSizeHOC(class Button extends PureComponent {
        constructor(props) {
          super(props);
          this.textRef = React.createRef();
          this.state = {
            width: null,
            buttonState: 'default',
            suffix: '',
          };
        }

        componentDidMount() {
         setInterval(() => this.setState(({suffix}) => ({
            suffix: (suffix +
              '.')
          })), 500)
        }

        currentBG() {
          const {buttonState} = this.state;
          const {width} = this.props.size;
          const key = 'button-' + buttonState + '-tree';
          let bg = elements.get(key);
          if (width) {
            bg = resize(bg, width - 1);
            console.log('new width background: ', width, bg);
          } else {
            console.log('no width', this.props);
          }
          return <SvGenus {...bg} />;
        }

        currentLabelStyle() {
          const {buttonState} = this.state;
          return elements.get('button-' + buttonState + '-label-style') || {};
        }

        setButtonState(buttonState) {
          this.setState({buttonState});
        }

        render() {
          const {children, size} = this.props;
          const {suffix} = this.state;
          console.log('button children:', children);
          const background = this.currentBG();
          console.log('Background: ', background);
          const labelStyle = this.currentLabelStyle();
          return <button
            onMouseEnter={() => this.setButtonState('hover')}
            onMouseLeave={() => this.setButtonState('default')}
            onMouseDown={() => this.setButtonState('down')}
            onMouseUp={() => this.setButtonState('hover')}
            ref={this.textRef} style={({
            ...buttonStyle,
            height: defaultTree.viewProps.height,
            position: 'absolute',
          })}>
            <div style={({position: 'absolute', left: 0, top: 0, overflow: 'hidden'})}>
            {background}
            </div>
            <div style={{...labelStyle, position: 'relative' }}>
              {children} {suffix}
            </div>
          </button>
        }
      });
    }
  });
};


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
