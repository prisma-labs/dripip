#!/usr/bin/env node
"use strict";
require("@oclif/command")
    .run()
    .then(require("@oclif/command/flush"))
    .catch(require("@oclif/errors/handle"));
