import React from "react";
import { Composition } from "remotion";
import { Film, SCENES, PARTS } from "./film";
import { validateEdit, validateCoverage, type Cut } from "./scenes";
import edit from "./edit.json";
validateEdit(SCENES, edit.cuts as Cut[]);
validateCoverage(SCENES, edit.cuts as Cut[], PARTS);
export function RemotionRoot() {
  return (
    <>
      {SCENES.map((s) => (
        <Composition
          key={s.id}
          id={s.id}
          component={s.component}
          durationInFrames={s.duration}
          width={1920}
          height={1080}
          fps={30}
        />
      ))}
      <Composition
        id="pinthread-promo"
        component={Film}
        durationInFrames={edit.cuts.reduce(
          (sum, cut) => sum + cut.out - cut.in,
          0,
        )}
        width={1920}
        height={1080}
        fps={30}
      />
    </>
  );
}
