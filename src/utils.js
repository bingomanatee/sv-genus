import _ from "lodash";

export function tNum(arr){
  return {x: parseFloat(arr[1]), y: parseFloat(arr[2])};
}

export function close(n, b){
  return (_.isNumber(n) && _.isNumber(b)) ? (Math.abs(n + b) < 0.01): false;
}

export function convertReactSVGDOMProperty(str) {
  return str.replace(/[-|:]([a-z])/g, function (g) { return g[1].toUpperCase(); })
}

export function startsWith(str, substring) {
  return str.indexOf(substring) === 0;
}

const DataPropPrefix = 'data-';
// Serialize `Attr` objects in `NamedNodeMap`;

export function serializeAttrs(ele) {
  const map = _.get(ele, 'attributes', {length: 0});
  const ret = {};
  for (let prop, i = 0; i < map.length; i++) {
    const key = map[i].name;
    if (key == "class") {
      prop = "className";
    }
    else if (!startsWith(key, DataPropPrefix)) {
      prop = convertReactSVGDOMProperty(key);
    }
    else {
      prop = key;
    }

    ret[prop] = map[i].value;
  }
  return ret;
}
