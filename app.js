/* eslint-disable linebreak-style */
/* eslint-disable camelcase */
/* eslint-disable indent */
/* eslint-disable no-tabs */
/* eslint-disable max-len */
/* eslint-disable object-curly-newline */
/* eslint-disable object-property-newline */
/* eslint-disable quotes */
/* eslint-disable quote-props */
/* eslint-disable consistent-return */

'use strict';


const Homey = require('homey');
const GoogleHomeTTS = require('./lib/GoogleHomeAudioTTS');

class googleTTS extends Homey.App {

    onInit() {
        this.log(`${Homey.manifest.id} running...`);

        const FoundDevices = [];

        FoundDevices['Broadcast'] = {name: 'Broadcast', description: 'Broadcast to all devices'};

        const discoveryStrategy = this.homey.discovery.getStrategy('googlecast');
        const initialResults = discoveryStrategy.getDiscoveryResults();

        Object.entries(initialResults).forEach(([key, discoveryResult]) => {
            if (discoveryResult.txt.md !== 'Google Cast Group') {
                this.log('Discovery result', JSON.stringify(discoveryResult, ' ', 4));
                const db = {};
                db.id = discoveryResult.id;
                db.host = discoveryResult.address;
                db.port = discoveryResult.port;
                db.name = discoveryResult.txt.fn;
                db.description = discoveryResult.txt.md;

                FoundDevices[discoveryResult.id] = db;
            }
        });

        discoveryStrategy.on('result', discoveryResult => {
            if (discoveryResult.txt.md !== 'Google Cast Group') {
                this.log('Change in discovery result', JSON.stringify(discoveryResult, ' ', 4));
                const db = {};
                db.id = discoveryResult.id;
                db.host = discoveryResult.address;
                db.port = discoveryResult.port;
                db.name = discoveryResult.txt.fn;
                db.description = discoveryResult.txt.md;
                FoundDevices[discoveryResult.id] = db;
            }
        });

        this.homey.flow.getActionCard('tts')
        .registerRunListener((args, state) => {
            return new Promise((resolve, reject) => {
                const device = new GoogleHomeTTS();
                device.setLanguage(args.language);
                if (args.speed) device.setTtsSpeed(args.speed);
                if (args.muted) device.setSendToMuted(args.muted);
                device.setVolume(args.volume / 100.0)
                device.setTts(args.text);

                if (args.device.name === 'Broadcast') {
                    for (let device_data in FoundDevices) {
                        if (FoundDevices[device_data].name !== 'Broadcast') {
                            device.setIp(FoundDevices[device_data].host);
                            device.audio();
                        }
                    }
                } else {
                    let ip = this.findDeviceIP(FoundDevices, args.device);

                    if (ip == undefined || ip == "0.0.0.0") return reject();

                    device.setIp(ip);
                    device.audio();
                }
                return resolve();
            });
        }).registerArgumentAutocompleteListener('device', (query, args) => {
            const devices = []

            for (const device_data in FoundDevices)
                if (FoundDevices[device_data].name.toLowerCase().indexOf(query.toLowerCase()) > -1 || FoundDevices[device_data].description.toLowerCase().indexOf(query.toLowerCase()) > -1)
                    devices.push(FoundDevices[device_data]);

            return Promise.resolve(devices);
        });
    }

    findDeviceIP(FoundDevices, device) {
        for (const device_data in FoundDevices)
            if (FoundDevices[device_data].name == device.name || (FoundDevices[device_data].id != undefined && FoundDevices[device_data].id == device.id))
                return FoundDevices[device_data].host;

        return "0.0.0.0";
    }

}

module.exports = googleTTS;