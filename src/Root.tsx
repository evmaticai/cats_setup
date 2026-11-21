import React from 'react';
import { Composition } from 'remotion';
import { ReefTest, REEF_FRAMES } from './three-shorts/dc02/ReefTest';
import { CastTest, type CastProps } from './three-shorts/dc02/CastTest';
import { CozyTest } from './three-shorts/cozy/CozyTest';
import { Isla, ISLA_FRAMES } from './three-shorts/cozy/isla/Isla';
import { Cookies, COOKIES_FRAMES } from './three-shorts/cozy/cookies/Cookies';
import { Dc02, DC02_FRAMES } from './three-shorts/dc02/Dc02';
import { Dc03, DC03_FRAMES } from './three-shorts/dc03/Dc03';
import { CharLineup } from './three-shorts/CharLineup';

// The cat videos only. Copied from kipishkrytoi's three-shorts branch (2026-11-21); new cat episodes are added here.
export const Root: React.FC = () => (
  <>
    <Composition id="Cookies" component={Cookies} width={720} height={1280} fps={30} durationInFrames={COOKIES_FRAMES} />
    <Composition id="Isla" component={Isla} width={720} height={1280} fps={30} durationInFrames={ISLA_FRAMES} />
    <Composition id="CozyTest" component={CozyTest} width={720} height={1280} fps={30} durationInFrames={150} />
    <Composition id="Dc02Reef" component={ReefTest} width={720} height={1280} fps={30} durationInFrames={REEF_FRAMES} />
    <Composition id="Dc02Cast" component={CastTest} width={720} height={1280} fps={30} durationInFrames={120} defaultProps={{ shot: 0 } as CastProps} />
    <Composition id="Dc02" component={Dc02} width={720} height={1280} fps={30} durationInFrames={DC02_FRAMES} defaultProps={{ sound: false }} />
    <Composition id="Dc03" component={Dc03} width={720} height={1280} fps={30} durationInFrames={DC03_FRAMES} />
    <Composition id="CharLineup" component={CharLineup} width={1280} height={1280} fps={30} durationInFrames={1} />
  </>
);
