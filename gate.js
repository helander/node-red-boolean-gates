/**
 *
 * Node Red node type: boolean gate
 *
 */
module.exports = (RED) => {
  const PAYLOAD_EMPTY = '';
  const GATE_AND = 'and';
  const GATE_NAND = 'nand';
  const GATE_OR = 'or';
  const GATE_NOR = 'nor';
  const GATE_NOT = 'not';
  const GATE_ENTRANCE = 'entrance';

  function BooleanGateNode(n) {
    RED.nodes.createNode(this, n);
    const node = this;
    const context = node.context();
    this.operator = n.gatetype;

    /**
     *
     * method adaptPayload(payload)
     *
     * Examines incoming payload and if possible convert to a boolean value.
     * Payload undefined or empty string is converted to empty object ({})
     *
     */
    this.adaptPayload = (payload) => {
      if (payload === undefined) return PAYLOAD_EMPTY;
      if (payload === PAYLOAD_EMPTY) return PAYLOAD_EMPTY;
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
      try {
        const msg = inmsg;
        if (this.operator === GATE_ENTRANCE) msg.topic = 'entrance';
        if (msg.topic === undefined || msg.topic === '') {
          node.status({ fill: 'red', shape: 'dot', text: 'No topic' });
          return undefined;
        }

        const input = this.adaptPayload(msg.payload);
        if (input === null) {
          node.status({ fill: 'red', shape: 'ring', text: `Payload ${JSON.stringify(msg.payload)}` });
          return undefined;
        }
        const inputs = context.get('inputs');
        if (Object.keys(inputs).length > 0) {
          if (inputs[msg.topic] === undefined && context.get('configured')) {
            node.status({ fill: 'red', shape: 'ring', text: `Late ${msg.topic}` });
            return undefined;
          }
        }
        if (typeof input === 'boolean') {
          inputs[msg.topic] = input;
        } else if (typeof inputs[msg.topic] !== 'boolean') {
          inputs[msg.topic] = input;
        }
        context.set('inputs', inputs);
        if (context.get('configured')) {
          if (this.isReady()) {
            context.set('ready', true);
            const nodeValue = this.value();
            send({ topic: node.id, payload: nodeValue });
          }
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
      if (!context.get('configured')) {
        fill = 'blue';
      }
      if (this.operator === GATE_NOT && Object.keys(context.get('inputs')).length > 1) {
        node.status({ fill: 'red', shape: 'ring', text: 'More than 1 input' });
      } else {
        node.status({ fill, shape });
      }
    };

    /**
     *
     * method value()
     *
     * Calculate the node's boolean value
     *
     */
    this.value = () => {
      // uses context.get('inputs') and this.operator to calculate output value
      const inputs = context.get('inputs');
      let output;
      switch (this.operator) {
        case GATE_AND:
        case GATE_NAND:
          output = true;
          for (let i = 0; i < Object.keys(inputs).length; i += 1) {
            if (inputs[Object.keys(inputs)[i]] === false) {
              output = false;
              break;
            }
          }
          break;
        case GATE_OR:
        case GATE_NOR:
          output = false;
          for (let i = 0; i < Object.keys(inputs).length; i += 1) {
            if (inputs[Object.keys(inputs)[i]] === true) {
              output = true;
              break;
            }
          }
          break;
        default: // GATE_NOT, GATE_ENTRANCE
          for (let i = 0; i < Object.keys(inputs).length; i += 1) {
            output = inputs[Object.keys(inputs)[i]];
          }
      }
      switch (this.operator) {
        case GATE_NAND:
        case GATE_NOR:
        case GATE_NOT:
          output = !output;
          break;
        default:
          break;
      }
      for (let i = 0; i < Object.keys(inputs).length; i += 1) {
        if (typeof inputs[Object.keys(inputs)[i]] === 'boolean') return output;
      }
      return undefined;
    };

    /**
     *
     * method isReady()
     *
     * Check if node is ready to produce output.
     *
     */
    this.isReady = () => {
      // Have all configured inputs been assigned values?
      // Unassigned inputs have empty object ({}) value.
      if (context.get('ready')) return true;
      const inputs = context.get('inputs');
      for (let i = 0; i < Object.values(inputs).length; i += 1) {
        if (Object.values(inputs)[i] === PAYLOAD_EMPTY) return false;
      }
      return Object.keys(inputs).length > 0;
    };

    /**
     *
     * Node startup
     *
     */
    context.set('ready', false);
    if (this.operator === 'entrance') {
      context.set('configured', true);
      context.set('inputs', { entrance: PAYLOAD_EMPTY });
      node.status({ fill: 'yellow', shape: 'ring' });
    } else {
      context.set('configured', false);
      context.set('inputs', {});
      node.status({ fill: 'blue', shape: 'ring' });
    }

    const setupTimer = setTimeout(() => {
      node.send({ topic: node.id, payload: '' });
    }, 100); //

    let configuredTimer;
    if (this.operator !== GATE_ENTRANCE) {
      configuredTimer = setTimeout(() => {
        context.set('configured', true);
        if (this.isReady()) {
          context.set('ready', true);
          const nodeValue = this.value();
          node.send({ topic: node.id, payload: nodeValue });
        }
        this.updateStatus();
      }, 5000);
    }

    this.on('close', () => {
      if (setupTimer) { clearInterval(setupTimer); }
      if (configuredTimer) { clearInterval(configuredTimer); }
    });
  }

  RED.nodes.registerType('boolean gate', BooleanGateNode);
};
