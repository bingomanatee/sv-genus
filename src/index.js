import React, {PureComponent} from 'react';
import axios from 'axios';
import _ from 'lodash';

const translateRE = /translate\((.*),(.*)/;
import {close, tNum, serializeAttrs} from './utils';

const svgFns = ('a,div,animate,animateMotion,animateTransform,circle,clipPath,color-profile,defs,desc,discard,ellipse,' +
  'feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,' +
  'feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,' +
  'fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,foreignObject,g,hatch,hatchpath,image,line,' +
  'linearGradient,marker,mask,mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,polygon,polyline,' +
  'radialGradient,rect,script,set,solidcolor,stop,style,svg,switch,symbol,text,textPath,title,tspan,unknown,use,view').split(',')
  .reduce((o, name) => {
    o[name] = (props) => {
      const children = React.Children.toArray(props.children);
      delete props.children;
      console.log('for ', name, 'returning for props', props, 'children', children);
      return React.createElement(name, props, ...children);
    };
    return o;
  }, {});

const domparser = new DOMParser();

export default class SvGenus extends PureComponent {
  render() {
    const props = this.props;
    let {svgTag, viewProps = {}, svgChildren = []} = props;
    if (viewProps.isValidSVG === false) return '';
    console.log('returning element of type ', svgTag, 'viewProps:', viewProps, 'with children', viewProps.children);
    return React.createElement(svgTag, viewProps, (svgChildren).map((subProps, i) => {
      return <SvGenus key={i} {...subProps} />
    }));
  }
}

SvGenus.svgToTree = (element, toSvGenus = false, isDocument = false) => {
  console.log('svgToTree:', element, toSvGenus, 'isD:', isDocument);
  if (isDocument) {
    return SvGenus.svgToTree(element.firstElementChild, toSvGenus);
  }
  if (!element) {
    return null;
  }
  const svgTag = element.tagName;
  let viewProps = {...serializeAttrs(element), }
  let svgChildren = [];
  console.log('=============processing children of ', svgTag, '<<<<', element.children, '>>>> with props', viewProps);
  for (let i = 0; i < element.children.length; ++i){
    svgChildren.push(SvGenus.svgToTree(element.children[i]));
  }
  console.log('=============result:', viewProps);
  if (toSvGenus) {
    console.log('making function for ', svgTag, 'viewProps:', viewProps);
    return (props) => (
        <SvGenus {...props} viewProps={viewProps} svgChildren={svgChildren} svgTag={svgTag}>
        </SvGenus>
      )
  } else {
    return {
      validSVG: true,
      viewProps,
      svgTag,
      svgChildren,
    };
  }
};

SvGenus.textToStyle = (label) => {
  const labelSpec = SvGenus.svgToTree(label);
  const labelStyleProps = {...labelSpec.viewProps};
  delete labelStyleProps.id;
  const offset = labelSpec.svgChildren[0].viewProps;
  labelStyleProps.paddingLeft = parseInt(offset.x, 10);
  labelStyleProps.paddingRight = parseInt(offset.x, 10)
  labelStyleProps.paddingTop = parseInt(offset.y, 10) - parseInt(labelStyleProps.fontSize, 10);
  labelStyleProps.paddingBottom = parseInt(offset.y, 10) - parseInt(labelStyleProps.fontSize, 10);
  console.log('labelStyleProps: ', labelStyleProps);
  return labelStyleProps;
}

SvGenus.setSvgWidth = (spec, width, specType = 'object') => {
  spec.viewProps.width = width;
  const viewBox = spec.viewProps.viewBox.split(' ');
  viewBox[2] = parseInt(width, 10);
  spec.viewProps.viewBox = viewBox.join(' ');
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

  /*        console.log('------ counts:', firstCount, secondCount);
          console.log('first group:', svgRootGroup);
          console.log('first subGroup:', firstSubGroup);
          console.log('second subGroup:', secondSubGroup);*/

  // -------- un-nesting

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
      console.log('found junk node ', ele);
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
      SvGenus[reactClassName] = compiler({elements, svgFns, SvGenus});
      return SvGenus;
    })
};
