/**
 *
 * Node Red node type: boolean circuit truth table
 *
 */
module.exports = (RED) => {
  function BooleanTableNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    this.truthjson = config.truthjson;
    const truth = JSON.parse(this.truthjson);
    /**
     *
     * The node's input message handler
     *
     */
    this.on('input', (msg, send) => {
      const ones = [];
      const dontcares = [];
      for (let i = 0; i < Object.keys(truth).length; i += 1) {
        const inputs = Object.keys(truth)[i];
        switch (truth[inputs]) {
          case '1':
            ones.push(inputs);
            break;
          case '-':
            dontcares.push(inputs);
            break;
          case '0':
            break;
          default:
            node.status({ text: `value error: ${truth[inputs]}` });
            break;
        }
      }
      if (ones.length === 0) {
        node.status({fill: 'red',text: 'No values in table.'});
      } else {
        node.status({});
        send([{ payload: { ones, dontcares } }]);
      }
      return undefined;
    });
  }

  RED.nodes.registerType('boolean table', BooleanTableNode);
};
