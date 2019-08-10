import React, {PureComponent} from 'react';
import axios from 'axios';
import _ from 'lodash';

const translateRE = /translate\((.*),(.*)/;
import {close, tNum, serializeAttrs} from './utils';
import ReactDOMServer from "react-dom/server";

const domparser = new DOMParser();

export default class SvGenus extends PureComponent {
  render() {
    const props = this.props;
    let {svgTag, viewProps = {}, svgChildren = []} = props;
    if (viewProps.isValidSVG === false) {
      return '';
    }
    return React.createElement(svgTag, viewProps, (svgChildren).map((subProps, i) => {
      return <SvGenus key={i} {...subProps} />
    }));
  }
}

SvGenus.svgToTree = ({element, toSvGenus = false, isDocument = false, parent = null}) => {
  if (!element) {
    return null;
  }

  if (isDocument) {
    return SvGenus.svgToTree({element: element.firstElementChild, toSvGenus});
  }
  const svgTag = element.tagName;
  let viewProps = {...serializeAttrs(element)}
  let svgChildren = [];
  for (let i = 0; i < element.children.length; ++i) {
    svgChildren.push(SvGenus.svgToTree({element: element.children[i]}));
  }
  if (toSvGenus) {
    console.log('making function for ', svgTag, 'viewProps:', viewProps);
    return (props) => (
      <SvGenus {...props} viewProps={viewProps} svgChildren={svgChildren} svgTag={svgTag}>
      </SvGenus>
    )
  } else {
    let out = {
      validSVG: true,
      viewProps,
      svgTag,
      svgChildren,
      parent
    };
    svgChildren.forEach(c => c.parent = out);
    return out;
  }
};

SvGenus.textToStyle = (label) => {
  const labelSpec = SvGenus.svgToTree({element: label});
  const labelStyleProps = {...labelSpec.viewProps};
  delete labelStyleProps.id;
  const offset = labelSpec.svgChildren[0].viewProps;
  const x = parseInt(offset.x, 10) || 0;
  const y = parseInt(offset.y, 10) || 0;
  const fontSize = parseInt(labelStyleProps.fontSize, 10);

  labelStyleProps.paddingLeft = x;
  labelStyleProps.paddingRight = x;
  if (fontSize && y && (y > fontSize)) {
    labelStyleProps.paddingTop = y - fontSize;
    labelStyleProps.paddingBottom = y - fontSize;
  }
  return labelStyleProps;
};

SvGenus.setSvgWidth = (spec, width, specType = 'object') => {
  spec.viewProps.width = width;
  const viewBox = spec.viewProps.viewBox.split(' ');
  viewBox[2] = parseInt(width, 10);
  spec.viewProps.viewBox = viewBox.join(' ');
};

SvGenus.svgToBackground = (svg, type='object') => {
  let svgString = (type === 'object') ? ReactDOMServer.renderToString(<SvGenus {...svg}/>) : svg.outerHTML
  let encoded = window.btoa(svgString);
  return "url(data:image/svg+xml;base64," + encoded + ")";
};

SvGenus.sanitizeStrangeNesting = (svg) => {
  SvGenus.removeRootJunk(svg);
  const svgEle = svg.firstElementChild;
  const firstCount = svgEle.children.length;
  const svgRootGroup = svgEle.firstElementChild;
  if (svgRootGroup.nodeName !== 'g') {
    console.log('bad root', svgRootGroup);
    return svg;
  }
  SvGenus.removeRootJunk(svgRootGroup);
  const secondCount = svgRootGroup.children.length;
  const firstSubGroup = svgRootGroup.firstElementChild;
  const secondSubGroup = _.get(firstSubGroup, 'firstElementChild');

  if (firstCount === 1 && secondCount === 1 && firstSubGroup) {
    let transform = _.get(firstSubGroup, 'attributes.transform.textContent');
    let t1 = translateRE.exec(transform);

    if (t1 && secondSubGroup) {
      transform = _.get(secondSubGroup, 'attributes.transform.textContent');
      let t2 = translateRE.exec(transform);
      if (t2) {
        const t2nums = tNum(t2);
        const t1nums = tNum(t1);
        if (close(t1nums.x, t2nums.x) && close(t1nums.y, t2nums.y)) {
          let children = secondSubGroup.children;
          svgRootGroup.removeChild(firstSubGroup);
          Array.from(children).forEach(child => svgRootGroup.appendChild(child));
        } else {
          console.log('--- cannot reoncile', t2nums, t1nums)
        }
      }
    } else {
      console.log('no second group');
    }
  }
  return svg;
};

SvGenus.removeRootJunk = (document) => {
  Array.from(document.querySelectorAll('desc,title,#text'))
    .forEach(ele => {
      document.firstElementChild.removeChild(ele);
    });

  return document;
};

SvGenus.elementProps = serializeAttrs;

SvGenus.defineComponent = ({
                             sourceSVGs,
                             extractor = _.identity,
                             compiler,
                             reactClassName
                           }) => {
  if (!reactClassName) {
    throw new Error("'reactClassName' required by defineComponent");
  }
  const elementMap = new Map();
  const promises = [];
  const svgList = _.get(sourceSVGs, 'svgs', sourceSVGs) || {};
  Object.keys(svgList).forEach(key => {
    let {data, url, doc} = svgList[key];
    let svg;
    if (data && typeof data === 'string') {
      svg = domparser.parseFromString(data, 'image/svg+xml');
      elementMap.set(key, {
        svg
      });
    } else if (doc && doc instanceof Document) {
      elementMap.set(key, {
        svg: doc
      });
    } else if (url) {
      promises.push(axios.get(url, {responseType: 'document'}).then((response) => {
        elementMap.set(key, response.data)
      }).catch(error => {
        elementMap.set(key, {error})
      }));
    }
  });

  return Promise.all(promises)
    .then(() => {
      let elements = extractor(elementMap) || elementMap;
      console.log('elements = ', elements);
      SvGenus[reactClassName] = compiler({elements, SvGenus});
      return SvGenus;
    })
};
