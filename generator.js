const QM = require('@helander/quine-mccluskey-js');
/**
 *
 * Node Red node type: boolean circuit generator
 *
 */

module.exports = (RED) => {
  function BooleanGeneratorNode(config) {
    RED.nodes.createNode(this, config);

    function binary(x) {
      const result = [];
      for (let i = 0; i < x.length; i += 1) {
        result.push(parseInt(x[i], 2));
      }
      return result;
    }
    // Generate expression from truth table
    function generateExpression(ones, dontcares) {
      let inputs = '';
      for (let i = 0; i < ones[0].length; i += 1) {
        inputs += String.fromCharCode(65 + i);
      }
      const nodesObject = {};
      const generated = (new QM(inputs, binary(ones), binary(dontcares))).getFunction();
      let solution = generated.replaceAll(' AND ', '*').replaceAll(' OR ', '+');
      for (let j = 0; j < inputs.length; j += 1) {
        const symbol = inputs.charAt(j);
        solution = solution.replaceAll(`NOT ${symbol}`, symbol.toLowerCase());
      }
      const sterms = solution.split('+');
      const terms = [];
      for (let j = 0; j < sterms.length; j += 1) {
        const values = [];
        const oterm = sterms[j].replace('(', '').replace(')', '');
        const svalues = oterm.split('*');
        for (let k = 0; k < svalues.length; k += 1) {
          values.push(svalues[k]);
          nodesObject[svalues[k].toUpperCase()] = {
            id: RED.util.generateId(),
            type: 'equ',
            inputs: [],
            wires: [[], []],
          };
        }
        terms.push(oterm);
        if (oterm.length > 1) {
          nodesObject[oterm] = {
            id: RED.util.generateId(),
            type: 'and',
            inputs: values,
            wires: [[], []],
          };
        }
      }
      nodesObject._ = {
        id: RED.util.generateId(),
        type: 'or',
        inputs: terms,
      };
      return nodesObject;
    }

    // Add wires between gate nodes
    function addWires(nodesObject) {
      const isLowerCase = (str) => str === str.toLowerCase();

      for (let i = 0; i < Object.keys(nodesObject).length; i += 1) {
        const key = Object.keys(nodesObject)[i];
        const n = nodesObject[key];
        for (let j = 0; j < n.inputs.length; j += 1) {
          let port = 0;
          let input = n.inputs[j];
          if (input.length === 1) {
            if (isLowerCase(input)) port = 1;
            input = input.toUpperCase();
          }
          const source = nodesObject[input];
          source.wires[port].push(n.id);
        }
      }

      return nodesObject;
    }

    function layoutNodes(nodesObject) {
      const nodes = [];
      let y1 = 80;
      let y2 = 80;
      let y3 = 80;
      for (let i = 0; i < Object.keys(nodesObject).length; i += 1) {
        const key = Object.keys(nodesObject)[i];
        const n = nodesObject[key];
        const newNode = {
          type: 'boolean gate',
          filter: '0',
          output: 'undefined',
          gatetype: n.type,
          id: n.id,
          wires: n.wires,
          nameprefix: key,
        };
        switch (n.type) {
          case 'equ':
            newNode.x = 200;
            newNode.y = y1;
            y1 += 50;
            break;
          case 'and':
            newNode.x = 400;
            newNode.y = y2;
            y2 += 50;
            break;
          case 'or':
            newNode.x = 600;
            newNode.y = y3;
            y3 += 50;
            break;
          default:
            break;
        }
        nodes.push(newNode);
      }
      return nodes;
    }

    function addLinks(nodes) {
      let id;
      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        switch (n.gatetype) {
          case 'equ':
            nodes.push({
              id: RED.util.generateId(),
              name: n.nameprefix,
              type: 'link in',
              links: [],
              x: n.x - 100,
              y: n.y - 1,
              wires: [[n.id]],
            });
            break;
          case 'or':
            id = RED.util.generateId();
            nodes.push({
              id,
              name: n.nameprefix,
              type: 'link out',
              links: [],
              mode: 'link',
              x: n.x + 100,
              y: n.y,
            });
            n.wires = [[id], []];
            break;
          default:
            break;
        }
      }
      return nodes;
    }

    function createFlowSpecification(nodes) {
      return { label: 'Boolean circuit', nodes };
    }

    /**
     *
     * The node's input message handler
     *
     */
    this.on('input', (msg, send) => {
      const truthTable = msg.payload;
      let nodesObject = generateExpression(truthTable.ones, truthTable.dontcares);
      nodesObject = addWires(nodesObject);
      let nodes = layoutNodes(nodesObject);
      nodes = addLinks(nodes);
      const flowSpec = createFlowSpecification(nodes);
      send([{ payload: flowSpec }]);
      return undefined;
    });
  }

  RED.nodes.registerType('boolean generator', BooleanGeneratorNode);
};
