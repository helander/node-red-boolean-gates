# @helander/node-red-boolean-gates

A <a href="http://nodered.org" target="_new">Node-RED</a> node that allows the creation of boolean circuits. Each node instance represents a logic gate that executes a boolean function.
With the help of Node-RED's wiring mechanism it is then possible to interconnect a set of logic gate instances to form a boolean circuit.

The boolean function of each node instance is configurable from the following selection:
 * AND
 * OR
 * EQU

In addition to this, each gate has two outputs, one non-inverted and one inverted. This makes the set of gate functions to also inlude NAND, NOR and NOT.

This component contains two extra node types, in addition to the boolean gate node type:
 * boolean circuit generator
 * boolean table

The circuit generator creates a flow with boolean gates (and link nodes to connect to the flow). The input to the generator is a truth table, that defines the circuits response to the set
of input combinations. The 'boolean table' node is used to simplify the creation of a truth table. Once the table node has been filled with data, send any message to it and it will 
produce an output that could be directly fed to a generator node.

Before you fill data into the table, you need to select its size, i.e. the number of inputs. Once you select the size, the number of rows adjust accordingly. Once you have saved
a table node, its size could not be changed, but you can change the output values in the rows.

The flow produced by the generator node can for example be sent (e.g. using an http-request node) to a node-red system's http admin interface, in order to create a flow with the
given content (i.e. the boolean circuit).

In case you want to 'embed' the boolean circuit into your own flows, just copy the nodes from the circuit flow and paste them into your flow. The link nodes may be omitted.

Note, that the extra node types are not required in order to use the boolean gate node type. 

# Install

You can install by using the `Menu - Manage Palette` option, or running the following command in your
Node-RED user directory - typically `~/.node-red`

        cd ~/.node-red
        npm i @helander/node-red-boolean-gates

# Usage

## Background
The mapping of boolean circuitry on to an implementation in Node-RED, requires some special considerations.

An electronic boolean circuit is "level based", since its current outputs depends on the current state of its inputs. Node-RED, on the other hand is "edge based", since
its outputs depends on the history/transitions of its inputs (messages) in addition to the current state, and further its outputs are purely transitional.

Node-RED does not provide any "level" inputs, but only transitions (messages). In order to perform a boolean function on a set of inputs, we need to store the input "levels" reported by
messages. If they are stored, we are able to retreive them whenever the boolean function is calculated. When a new input value (message) is received, it replaces the value previously stored
for this input.

## Solution design

One observation from the above is that in order to calculate the correct value for a boolean function, values for all of its inputs must have been received. 

* How do we ensure that all input values have been provided, when the boolean function output needs to be calculated ?
* Can we ensure that all input values are provided when they are required?
* If not, what should the system do?

The answers to these questions requires knowledge about and insights into the solution/application to be designed. This things can not be managed by Node-RED and its plugin components, but
falls on the solution/application (creator of the Node-RED flows) to deal with. However the `@helander/node-red-boolean-gates` module incorporates a couple of configurable features that can
help the solution/application designer.

### Solution design hints

What happens if the system outputs 'wrong' state, due to late incoming inputs at startup (e.g. some input messages might be produced periodically) ? 
Is that Ok or do we need to do something about it? 

One thing we could do is to allow for some time to pass before we create any output messages. When this time has passed we then create output messages based on the 
input values we have achieved so far. If input values are still missing, they will be brought into the calculations once they start to appear.

Producing gate output based on unknown set of inputs , may sometimes be problematic. In some of these cases, producing a controlled output (true or false) might be
a better solution. 

If we would discard all output messages until all required input values have been provided, would that be the way we wanted the system to act? 
This is actually the default way these node instances work. If you want this you need not take any specific actions.

### Configuration options

In addition to selecting the boolan function of a node, the following configuration options are available:
* `Startup filter` - A time period, in seconds, during node startup when no node output is produced.
* `Default output` - Select what to happen if not enough input is available. No output, true or false are the options. 
This function is not available in case the `Startup filter` period is 0 seconds.

It should be noted that, the application of these configurations might not be required on all nodes in a flow. If a node "early" in a flow do not produce output, that will impact other nodes further "down" the flow. In many cases, it may be enough to apply these configurations in the gate nodes where signals are entering the boolean "circuit".


# Implementation info

The component uses the Node-RED Messaging hook API to ensure that the topic of each message that is sent to a gate node is set to the identity of the message source (node id and port index).

# Help and examples

Please see node help and provided examples.

![Example flow for input values](/examples/inputtest.jpg)

![Example flow for a few gates](/examples/inoperation.jpg)

![Example flow for generator](/examples/generator.jpg)
