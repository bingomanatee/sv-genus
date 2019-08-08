const fs = require('fs');
const fsp = fs.promises
const path = require('path');
const minimist = require('minimist');
const input = minimist(process.argv.slice(2), {
  alias: {
    t: 'target',
    n: 'name',
    o: 'output'
  }
});

function asJSON(str) {
  if (!/\.json$/i.test(str)) {
    return `${str}.json`;
  }
  return str;
}

let {target, output, name} = input;
console.log('processing:', input);

if (!target) {
  throw new Error('must have target to process:( --target=myPath.json or -t=myPath.json)')
}
if (!output) {
  output = name ? path.dirname(target) + '/' + asJSON(name) : target + '__processes.json';
}
const fileToData = async (filePath) => {
  if (!/.svg$/.test(filePath)) {
    return null;
  }
  let data = await fsp.readFile(filePath);
  return {
    name: path.basename(filePath, '.svg'),
    filePath,
    data: data.toString().replace(/[\s]+/g, ' ')
  }
};

fs.lstat(target, function (err, stats) {
    (async (err, stats) => {
        if (err) {
          console.log('cannot get target: ', target, err.message);
          return;
        }

        let result = {
          target,
          path: path.resolve(target),
        };

        console.log('lstat: ', err, stats, result);

        if (stats.isDirectory()) {
          let files;
          try {
            files = await fsp.readdir(target);
          } catch (err) {
            console.log('error reading', target, err);
            return;
          }
          const svgs = await Promise.all(files.filter(filename => /.svg$/i.test(filename))
            .map(name => path.resolve(target, name))
            .map(fileToData));

          result.svgs = svgs.filter(a => a);
        } else if (stats.isFile() && /.svg$/i.test(target)) {
          const item = await fileToData(target);
          result.svgs = [item].filter(a => a);
        } else {
          throw new Error('cannot process ' + target);
        }
        result.svgs = result.svgs.reduce((list, svg) => {
          list[svg.name] = svg;
          return list;
        }, {});
        const dest = asJSON(output || name);
        console.log('writing', result, 'to', dest);
        fsp.writeFile(dest, JSON.stringify(result));
      }
    )(err, stats);
  }
);
