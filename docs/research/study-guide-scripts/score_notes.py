"""
Reads a single-line MusicXML score (like the studio's Syrinx) into a plain list of notes, for the study-guide scripts.

Each note has its bar number, where it starts in the bar (in quarter notes), its MIDI number, its length (in quarter
notes, with ties joined into one note) and whether it is a grace note. Grace notes have no written length; they get
a small nominal one (a 32nd) so they count for a little in "time spent on each pitch".

Only what a monophonic flute part needs: one voice, no chords. Rests are skipped (they still move time forward).
"""
import xml.etree.ElementTree as ET
from dataclasses import dataclass

STEPS = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
GRACE_QUARTERS = 0.125


@dataclass
class ScoreNote:
    bar: str
    beat: float  # quarter notes from the start of the bar
    midi: int
    quarters: float
    grace: bool
    onset: float  # quarter notes from the start of the piece


def read_notes(path):
    root = ET.parse(path).getroot()
    part = root.find("part")
    divisions, notes, piece_time = 1, [], 0.0
    tie_open = None
    for measure in part.findall("measure"):
        bar, time = measure.get("number"), 0.0
        for element in measure:
            if element.tag == "attributes" and element.find("divisions") is not None:
                divisions = int(element.find("divisions").text)
            elif element.tag == "backup":
                time -= int(element.find("duration").text) / divisions
            elif element.tag == "forward":
                time += int(element.find("duration").text) / divisions
            elif element.tag == "note":
                grace = element.find("grace") is not None
                duration = element.find("duration")
                quarters = GRACE_QUARTERS if grace else (int(duration.text) / divisions if duration is not None else 0)
                if element.find("chord") is not None:
                    continue  # a flute part has none; ignore any stray chord tones
                pitch = element.find("pitch")
                if pitch is None:  # a rest
                    time += 0 if grace else quarters
                    tie_open = None
                    continue
                midi = 12 * (int(pitch.find("octave").text) + 1) + STEPS[pitch.find("step").text]
                alter = pitch.find("alter")
                if alter is not None:
                    midi += int(round(float(alter.text)))
                ties = {t.get("type") for t in element.findall("tie")}
                if "stop" in ties and tie_open is not None and tie_open.midi == midi:
                    tie_open.quarters += quarters  # the tied continuation lengthens the note it is tied to
                else:
                    notes.append(ScoreNote(bar, time, midi, quarters, grace, piece_time + time))
                tie_open = notes[-1] if "start" in ties else None
                if not grace:
                    time += quarters
        piece_time += max(time, 0)
    return notes


def read_words(path):
    """The written directions (tempo and character words like "Cédez"), as (bar, text), in score order."""
    root = ET.parse(path).getroot()
    found = []
    for measure in root.find("part").findall("measure"):
        for words in measure.iter("words"):
            text = (words.text or "").strip()
            if text:
                found.append((measure.get("number"), text))
    return found


NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def name(midi):
    return f"{NAMES[midi % 12]}{midi // 12 - 1}"


if __name__ == "__main__":
    import sys
    notes = read_notes(sys.argv[1])
    print(f"{len(notes)} notes (ties joined), {sum(n.grace for n in notes)} grace notes, bars {notes[0].bar} to {notes[-1].bar}")
    for n in notes[:12]:
        print(f"bar {n.bar:>3} beat {n.beat:5.2f}  {name(n.midi):<4} {n.quarters:5.3f} q{'  (grace)' if n.grace else ''}")
