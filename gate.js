/**
 *
 * Node Red node type: boolean gate
 *
 */
module.exports = (RED) => {
  const GATE_AND = 'and';
  const GATE_OR = 'or';
  const GATE_EQU = 'equ';
  const LOGICAL_INPUT_SINGLE = 'single';
  const gatenodes = {};

  function BooleanGateNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    this.operator = config.gatetype;
    this.filter = config.filter;
    this.nameprefix = config.nameprefix;
    this.nodeinputs = {};
    if (config.output === 'undefined') {
      delete this.output;
    } else {
      this.output = config.output === 'true';
    }

    /**
     *
     * method adaptPayload(payload)
     *
     * Examines incoming payload and if possible convert to a boolean value.
     * Payload undefined or empty string is converted to empty object ({})
     *
     */
    this.adaptPayload = (payload) => {
      if (payload === undefined) return null;
      switch (typeof payload) {
        case 'boolean': return payload;
        case 'number': return (payload > 0.5);
        case 'string': return null;
        case 'object':
          if (payload.On === undefined) {
            return null;
          }
          switch (typeof payload.On) {
            case 'boolean': return payload.On;
            case 'number': return (payload.On > 0.5);
            default: return null;
          }

        default: return null;
      }
    };

    /**
     *
     * The node's input message handler
     *
     */
    this.on('input', (inmsg, send) => {
      const msg = inmsg;
      try {
        if (msg.topic === undefined || msg.topic === '') {
          node.status({ fill: 'red', shape: 'dot', text: 'No topic' });
          return undefined;
        }
        const input = this.adaptPayload(msg.payload);
        if (input === null) {
          node.status({ fill: 'red', shape: 'ring', text: `Payload ${JSON.stringify(msg.payload)}` });
          return undefined;
        }

        if (this.nodeinputs[LOGICAL_INPUT_SINGLE] !== undefined) msg.topic = LOGICAL_INPUT_SINGLE;

        this.inputs[msg.topic] = input;
        if (this.isReady()) {
          const nodeValue = this.value();
          send([{ payload: nodeValue }, { payload: !nodeValue }]);
        }
        this.updateStatus();
      } catch (err) { node.log(`error  ${err}`); }
      return undefined;
    });

    /**
     *
     * method updateStatus()
     *
     * Update the node's status information display.
     *
     */
    this.updateStatus = () => {
      let fill;
      let shape;

      const output = this.value();
      fill = 'green';
      if (typeof output === 'boolean') {
        if (output) {
          shape = 'dot';
        } else {
          shape = 'ring';
        }
      }
      if (!this.isReady()) {
        fill = 'grey';
      }
      if (output === undefined) {
        fill = 'yellow';
        shape = 'ring';
      }
      if (this.toomany === true) {
        fill = 'blue';
      }
      node.status({ fill, shape });
    };

    /**
     *
     * method value()
     *
     * Calculate the node's boolean value
     *
     */
    this.value = () => {
      let output;
      switch (this.operator) {
        case GATE_AND:
          output = true;
          for (let i = 0; i < Object.keys(this.inputs).length; i += 1) {
            if (this.inputs[Object.keys(this.inputs)[i]] === false) {
              output = false;
              break;
            }
          }
          break;
        case GATE_OR:
          output = false;
          for (let i = 0; i < Object.keys(this.inputs).length; i += 1) {
            if (this.inputs[Object.keys(this.inputs)[i]] === true) {
              output = true;
              break;
            }
          }
          break;
        default: // GATE_EQU
          for (let i = 0; i < Object.keys(this.inputs).length; i += 1) {
            output = this.inputs[Object.keys(this.inputs)[i]];
          }
      }
      for (let i = 0; i < Object.keys(this.nodeinputs).length; i += 1) {
        const key = Object.keys(this.nodeinputs)[i];
        if (typeof this.inputs[key] !== 'boolean') return this.defaultOutput;
      }
      return output;
    };

    /**
     *
     * method isReady()
     *
     * Check if node is ready to produce output.
     *
     */
    this.isReady = () => {
      if (this.filter !== '0') return false;
      if (this.defaultOutput !== undefined) return true;
      for (let i = 0; i < Object.keys(this.nodeinputs).length; i += 1) {
        const key = Object.keys(this.inputs)[i];
        if (typeof this.inputs[key] !== 'boolean') return false;
      }
      return true;
    };

    /**
     *
     * Node startup
     *
     */
    // Find the wires leading to this node
    RED.nodes.eachNode((from) => {
      try {
        if (from.d !== true && from.wires !== undefined) {
          if (from.wires.length > 0) {
            for (let port = 0; port < from.wires.length; port += 1) {
              const to = from.wires[port];
              for (let i = 0; i < to.length; i += 1) {
                if (to[i] === node.id) {
                  this.nodeinputs[`${from.id}:${port}`] = {};
                }
              }
            }
          }
        }
      } catch (error) {
        node.error(`Problem when using unofficial API.${error}`);
      }
    });

    if (this.operator === GATE_EQU) {
      if (Object.keys(this.nodeinputs).length > 1) this.toomany = true;
      this.nodeinputs = {};
      this.nodeinputs[LOGICAL_INPUT_SINGLE] = {};
    }

    this.inputs = {};
    let filterTimer;
    if (this.filter !== '0') {
      filterTimer = setTimeout(() => {
        this.filter = '0';
        this.defaultOutput = this.output;
        if (this.isReady()) {
          const nodeValue = this.value();
          node.send([{ payload: nodeValue }, { payload: !nodeValue }]);
        }
        this.updateStatus();
      }, Number(this.filter) * 1000);
    }

    this.on('close', () => {
      if (filterTimer) clearTimeout(filterTimer);
      delete gatenodes[node.id];
      this.nodeinputs = {};
    });

    node.status({ fill: 'grey', shape: 'dot' });
    gatenodes[node.id] = {};
  }

  RED.nodes.registerType('boolean gate', BooleanGateNode);

  RED.hooks.add('preRoute', (sendEvent) => {
    // Messages to gate nodes will have topic set to port of source node
    if (gatenodes[sendEvent.destination.id] !== undefined) {
      const event = sendEvent;
      event.msg.topic = `${sendEvent.source.id}:${sendEvent.source.port}`;
    }
  });
};
