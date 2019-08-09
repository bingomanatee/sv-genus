import React, {Component, PureComponent} from 'react'
import {render} from 'react-dom'
import _ from 'lodash';

import SvGenus from '../../src'

import sourceSVGs from './buttons.json';

const buttonWrapperStyle = (props) => {
  let out = {
    position: 'relative'
  };
  if (props.width) {
    out.width = props.width;
  }
  return out;
}

const bwiStyle = {
  left: 0,
  top: 0,
  position: 'absolute',
};
const ButtonWrapper = ({children, width = 0}) => (
  <div style={buttonWrapperStyle({width})}>
    {React.Children.toArray(children).map((child, i) => (
      <div style={bwiStyle} key={i}>
        {child}
      </div>
    ))}
  </div>
);

const button = async (SvGenus) => {
  return SvGenus.defineComponent({
    sourceSVGs,
    reactClassName: 'Button',
    extractor(elementMap) {
      'button-default,button-disabled,button-down,button-hover'.split(',')
        .forEach(name => {
          if (!elementMap.has(name)) {
            return;
          }
          const {svg} = elementMap.get(name);
          const label = svg.querySelector('#button-label');
          elementMap.set(name + '-label', label);
          const background = svg.querySelector('#' + name);

          while (svg.firstElementChild.firstElementChild) {
            svg.firstElementChild.removeChild(svg.firstElementChild.firstElementChild)
          }
          for (let i = 0; i < background.children.length; ++i)
            svg.firstElementChild.appendChild(background.children[i]);
          background.removeChild(label);
        })
    },
    compiler({elements, svgFns, SvGenus}) {

      let defaultBGtree = SvGenus.svgToTree(elements.get('button-default').svg, false, true);
      let downBGtree = SvGenus.svgToTree(elements.get('button-down').svg, false, true);
      let disabledBGtree = SvGenus.svgToTree(elements.get('button-disabled').svg, false, true);
      let hoverBGtree = SvGenus.svgToTree(elements.get('button-hover').svg, false, true);

      const labelDefaultStyle = SvGenus.textToStyle(elements.get('button-default-label'));
      const labelHoverStyle = SvGenus.textToStyle(elements.get('button-hover-label'));
      const labelDownStyle = SvGenus.textToStyle(elements.get('button-down-label'));

      return class Button extends PureComponent {
        constructor(props) {
          super(props);
          this.textRef = React.createRef();
          this.state = {
            wrapperStyle: {
              width: null,
              height: defaultBGtree.viewProps.height
            },
            defaultBG: _.cloneDeep(defaultBGtree),
            downBG: _.cloneDeep(downBGtree),
            disabledBG: _.cloneDeep(disabledBGtree),
            hoverBG: _.cloneDeep(hoverBGtree),
            buttonState: 'default'
          };
        }

        componentDidMount() {
          const width = this.textRef.current.clientWidth;
          let {wrapperStyle, defaultBG, downBG, disabledBG, hoverBG} = this.state;

          const resize = (bg) => {
            SvGenus.setSvgWidth(bg, width, 'object');
            const rect = _.get(bg, 'svgChildren[0].svgChildren[0]');
            if (rect && rect.svgTag === 'rect') {
              rect.viewProps.width = width;
            }
            return _.cloneDeep(bg);
          };

          defaultBG = resize(defaultBG);
          downBG = resize(downBG);
          disabledBG = resize(disabledBG);
          hoverBG = resize(hoverBG);

          this.setState({
            defaultBG,
            downBG,
            disabledBG,
            hoverBG,
            wrapperStyle: {...wrapperStyle, width}
          });
        }

        currentBG() {
          const {buttonState, defaultBG, downBG, hoverBG, disabledBG} = this.state;
          switch (buttonState) {
            case 'default':
              return defaultBG;
              break;

            case 'hover':
              return hoverBG;
              break;

            case 'down':
              return downBG;
              break;
          }
          return defaultBG;
        }

        currentLabelStyle() {
          switch (buttonState) {
            case 'default':
              return labelDefaultStyle;
              break;

            case 'hover':
              return labelHoverStyle;
              break;

            case 'down':
              return labelDownStyle;
              break;
          }
          return labelDefaultStyle;
        }

        setButtonState(buttonState) {
          console.log('setting button state:', buttonState);
          this.setState({buttonState});
        }

        render() {
          const {children} = this.props;
          console.log('button children:', children);
          const {wrapperStyle} = this.state;

          let bg = this.currentBG();
          const labelStyle = this.currentLabelStyle();
          return <div style={wrapperStyle}>
            <ButtonWrapper>
              <SvGenus viewProps={bg.viewProps}
                       svgTag={bg.svgTag}
                       svgChildren={bg.svgChildren}/>
              <div
                onMouseEnter={() => this.setButtonState('hover')}
                onMouseLeave={() => this.setButtonState('default')}
                onMouseDown={() => this.setButtonState('down')}
                onMouseUp={() => this.setButtonState('hover')}
                ref={this.textRef}
                style={({whiteSpace: 'nowrap', ...labelStyle})}>
                {children}
              </div>
            </ButtonWrapper>
          </div>
        }
      }
    }
  })
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
