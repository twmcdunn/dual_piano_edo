
var AudioContext = window.AudioContext // Default
    || window.webkitAudioContext // Safari and old versions of Chrome
    || false;

var audioContext = new AudioContext();


function startApp() {
    // Check if Web MIDI API is supported
    if (!navigator.requestMIDIAccess) {
        alert('Web MIDI API not supported by this browser. It works in pretty much every browser except Safari.');
    } else {
        initMIDI();
    }

    if (audioContext.state != "running") {
        audioContext.resume();
    }
    queueSounds1();

    document.getElementById("gui").classList.toggle('hidden');
    document.getElementById("welcome").classList.toggle('hidden');
};

var nodeMap = new Map();

var c0Freq = 440 * (2 ** (3 / 12)) * (2 ** -5);
var refFreqs = [2077, 2077, 2077, 2077, 2077];
var TET = 15;

var buffers = [];
async function queueSounds1() {
    if (audioContext.state != "running") {
        audioContext.resume();
    }
    /*
        try {
            navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then((mediastream) => {
                mediastream.getAudioTracks().forEach((trk) => {
                    //trk.enabled = false;
                    //trk.stop();
                    trk.applyConstraints({
                        autoGainControl: false,
                        noiseSuppression: false,
                        echoCancellation: false
                    });
                })
            });
        }
        catch (e) {
            //alert("NO Navigator");
        }
            */

    function loadSound(target, n, last) {
        var url = "https://delightofcomposition.org/etude_for_smart_phones/sounds/" + n + ".mp3";//could go back to mp3 w/ audacity batch process if needed
        var req = new XMLHttpRequest();
        req.responseType = "arraybuffer";
        req.onload = function () {
            audioContext.decodeAudioData(req.response, function (buffer) {
                target.push(buffer);
                if (n < last) {
                    loadSound(target, n + 1, last);
                }
            })
        };
        req.open("GET", url);
        req.send();
    }

    loadSound(buffers, 1, 5);

    try {
        const wakeLock = await navigator.wakeLock.request("screen");
    } catch (err) {
        // the wake lock request fails - usually system related, such being low on battery
        console.log(`${err.name}, ${err.message}`);
    }

}


async function initMIDI() {
    try {
        const midiAccess = await navigator.requestMIDIAccess();

        // Listen to all MIDI inputs
        for (const input of midiAccess.inputs.values()) {
            input.addEventListener('midimessage', handleMIDIMessage);
            console.log('Connected to:', input.name);
        }

        // Listen for new device connections
        midiAccess.addEventListener('statechange', (e) => {
            if (e.port.type === 'input' && e.port.state === 'connected') {
                e.port.addEventListener('midimessage', handleMIDIMessage);
            }
        });

    } catch (error) {
        alert('Failed to get MIDI access: ' + error.message);
    }
}

function convertNote(note) {
    if (note >= 60) {
        note -= 60;
        let oct = Math.floor(note / 12.0);
        let pc = note - 12 * oct;
        return (12 * pianoAMap[pc] / TET) + 12 * oct + 60;
    }
    else {
        note -= 24;
        let oct = Math.floor(note / 12.0);
        let pc = note - 12 * oct;
        return (12 * pianoBMap[pc] / TET) + 12 * oct + 60;

    }
    return note;
}

var pedalState = false;
function handleMIDIMessage(event) {
    var [status, note, velocity] = event.data;
    const channel = (status & 0x0f) + 1;
    const command = status & 0xf0;

    switch (command) {
        case 0x90: // Note On
            if (velocity > 0) {
                const source = audioContext.createBufferSource();
                source.buffer = buffers[0];
                const gainNode = audioContext.createGain();
                gainNode.gain.setValueAtTime(velocity / 128.0, audioContext.currentTime);
                source.connect(gainNode);
                gainNode.connect(audioContext.destination);

                origNote = note;
                note = convertNote(note);

                //source.playbackRate.value = (c0Freq * (2 ** (note.hs / 20.0))) / refFreqs[Number(note.sampleNum) - 1];
                var ratio = (c0Freq * (2 ** (4 + (note - 60) / 12.0))) / refFreqs[0];
                var cents = Math.log2(ratio) * 1200;
                //console.log("CENTS: " + cents);

                try {
                    source.detune.value = cents;
                }
                catch (e) {
                    source.playbackRate.value = ratio;
                }

                source.start();
                if (nodeMap.get(origNote)) {
                    nodeMap.get(origNote).push({ source, gainNode })
                }
                else {
                    nodeMap.set(origNote, [{ source, gainNode }]);
                }


            } else {
                // Velocity 0 is effectively note off
                endNote(note);
            }
            break;

        case 0x80: // Note Off
            endNote(note);
            break;

        case 0xb0: // Control Change
            if (note === 64) { // Sustain pedal (CC 64)
                pedalState = velocity >= 64 ? true : false;
                if (!pedalState) {
                    endQueuedNotes();
                }
            } else {
            }
            break;
    }
}

function getNoteName(noteNumber) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1;
    const note = notes[noteNumber % 12];
    return `${note}${octave}`;
}

queuedNotes = [];
function endNote(noteNumber) {
    endFunc = function () {
        nodesArr = nodeMap.get(noteNumber);
        nodes = nodesArr.pop();
        nodes.gainNode.gain.setValueAtTime(nodes.gainNode.gain.value, audioContext.currentTime);
        nodes.gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        nodes.source.stop(audioContext.currentTime + 0.1);
    };
    if (!pedalState) {
        endFunc();
    }
    else {
        queuedNotes.push(endFunc);
    }
}

function endQueuedNotes() {
    while (queuedNotes.length > 0) {
        queuedNotes.pop()();
    }
}