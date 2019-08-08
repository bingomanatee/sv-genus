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

const bwiStyle = {left: 0, top: 0, position: 'absolute'}
const ButtonWrapper = ({children, width = 0}) => (
  <div style={buttonWrapperStyle({width})}>
   {React.Children.toArray(children).map((child, i) => (
     <div style={bwiStyle}>
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
      'button-default,button-disabled,button-down,button-hoer'.split(',')
        .forEach(name => {
          if (!elementMap.has(name)) {
            return;
          }
          const {svg} = elementMap.get(name);

          console.log('processing svg ', name, ': ', svg);
          const svgProps = SvGenus.elementProps(svg);
          console.log('svg props for ', name, svgProps, 'based on', svg.attributes);

          //SvGenus.sanitizeStrangeNesting(svg);

          const label = svg.querySelector('#button-label');
          if (label) {
            console.log('removing label', label);
            label.parentElement.removeChild(label);
          }
        })
    },
    compiler({elements, svgFns, SvGenus}) {
      let {svg} = elements.get('button-default');
      let Background = svg ? SvGenus.svgToTree(svg, true, true) : null;

      console.log('>>>> compiled Background:', Background, 'elements:', elements);

      return class Button extends PureComponent {
        render() {
          const {children} = this.props;
          console.log('button children:', children);
          if (Background) {
            return <ButtonWrapper>
              <Background />
              {children}
            </ButtonWrapper>
          }
          else {
            return '... no background';
          }
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
