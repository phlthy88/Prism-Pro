
import React, { useEffect, useState } from 'react';
import { FilterState, AudioConfig } from '../types';

export const useMidi = (
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>,
    setAudioConfig: React.Dispatch<React.SetStateAction<AudioConfig>>
) => {
    const [midiAccess, setMidiAccess] = useState<any>(null);
    const [connectedDevice, setConnectedDevice] = useState<string | null>(null);

    useEffect(() => {
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess({ sysex: false })
                .then(onMIDISuccess, onMIDIFailure);
        }

        function onMIDISuccess(access: any) {
            setMidiAccess(access);
            for (let input of access.inputs.values()) {
                input.onmidimessage = getMIDIMessage;
                setConnectedDevice(input.name);
            }
            access.onstatechange = (e: any) => {
                if (e.port.state === 'connected') setConnectedDevice(e.port.name);
            };
        }

        function onMIDIFailure() {
            console.warn('Could not access your MIDI devices.');
        }

        function getMIDIMessage(message: any) {
            const command = message.data[0];
            const cc = message.data[1];
            const value = message.data[2];

            // CC Messages usually start with 176 (Channel 1)
            if (command >= 176 && command <= 191) {
                const norm = value / 127; // 0 to 1

                // Mapping Strategy: Generic CCs
                // CC1: Zoom (1x to 3x)
                if (cc === 1) {
                     setFilters(prev => ({ ...prev, zoom: 1 + (norm * 2) }));
                }
                // CC2: Exposure (-2 to 2)
                if (cc === 2) {
                     setFilters(prev => ({ ...prev, exposure: -2 + (norm * 4) }));
                }
                // CC3: LUT Intensity
                if (cc === 3) {
                     setFilters(prev => ({ ...prev, lutIntensity: norm }));
                }
                // CC4: Blur
                if (cc === 4) {
                     setFilters(prev => ({ ...prev, blur: norm }));
                }
                 // CC7: Volume/Gain
                if (cc === 7) {
                     setAudioConfig(prev => ({ ...prev, gain: norm * 2 }));
                }
            }
        }
    }, [setFilters, setAudioConfig]);

    return { connectedDevice };
};
