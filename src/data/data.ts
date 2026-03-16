export interface BgAsset { id: string; name: string; tag: string; primaryColor: string; videoUrl: string }
export interface CharAsset { id: string; name: string; tag: string; accentColor: string; imgUrl: string; voiceId: string }

export const BG_ASSETS: BgAsset[] = [
  { id: 'mine-1', name: 'Minecraft #1', tag: 'Minecraft', primaryColor: '#1b5e20', videoUrl: '/background/Minecraft/mine-1.mp4' },
  { id: 'mine-2', name: 'Minecraft #2', tag: 'Minecraft', primaryColor: '#2e7d32', videoUrl: '/background/Minecraft/mine-2.mp4' },
  { id: 'mine-3', name: 'Minecraft #3', tag: 'Minecraft', primaryColor: '#33691e', videoUrl: '/background/Minecraft/mine-3.mp4' },
  { id: 'mine-4', name: 'Minecraft #4', tag: 'Minecraft', primaryColor: '#1b5e20', videoUrl: '/background/Minecraft/mine-4.mp4' },
  { id: 'mine-5', name: 'Minecraft #5', tag: 'Minecraft', primaryColor: '#2e7d32', videoUrl: '/background/Minecraft/mine-5.mp4' },
  { id: 'mine-6', name: 'Minecraft #6', tag: 'Minecraft', primaryColor: '#1b5e20', videoUrl: '/background/Minecraft/mine-6.mp4' },
  { id: 'mine-7', name: 'Minecraft #7', tag: 'Minecraft', primaryColor: '#2e7d32', videoUrl: '/background/Minecraft/mine-7.mp4' },
  { id: 'mine-8', name: 'Minecraft #8', tag: 'Minecraft', primaryColor: '#33691e', videoUrl: '/background/Minecraft/mine-8.mp4' },
  { id: 'mine-9', name: 'Minecraft #9', tag: 'Minecraft', primaryColor: '#1b5e20', videoUrl: '/background/Minecraft/mine-9.mp4' },
  { id: 'ss-1', name: 'Subway Surfers #1', tag: 'Subway Surfers', primaryColor: '#bf360c', videoUrl: '/background/Subway Surfers/ss-vid-1.mp4' },
  { id: 'ss-2', name: 'Subway Surfers #2', tag: 'Subway Surfers', primaryColor: '#bf360c', videoUrl: '/background/Subway Surfers/ss-vid-2.mp4' },
  { id: 'ss-3', name: 'Subway Surfers #3', tag: 'Subway Surfers', primaryColor: '#c62828', videoUrl: '/background/Subway Surfers/ss-vid-3.mp4' },
  { id: 'ss-4', name: 'Subway Surfers #4', tag: 'Subway Surfers', primaryColor: '#bf360c', videoUrl: '/background/Subway Surfers/ss-vid-4.mp4' },
  { id: 'ss-5', name: 'Subway Surfers #5', tag: 'Subway Surfers', primaryColor: '#c62828', videoUrl: '/background/Subway Surfers/ss-vid-5.mp4' },
  { id: 'ss-6', name: 'Subway Surfers #6', tag: 'Subway Surfers', primaryColor: '#bf360c', videoUrl: '/background/Subway Surfers/ss-vid-6.mp4' },
  { id: 'ss-7', name: 'Subway Surfers #7', tag: 'Subway Surfers', primaryColor: '#c62828', videoUrl: '/background/Subway Surfers/ss-vid-7.mp4' },
  { id: 'other-1', name: 'Cinematic #1', tag: 'Other', primaryColor: '#311b92', videoUrl: '/background/Other/other-1.mp4' },
  { id: 'other-2', name: 'Cinematic #2', tag: 'Other', primaryColor: '#0f3460', videoUrl: '/background/Other/other-2.mp4' },
  { id: 'other-3', name: 'Cinematic #3', tag: 'Other', primaryColor: '#006994', videoUrl: '/background/Other/other-3.mp4' },
  { id: 'other-4', name: 'Cinematic #4', tag: 'Other', primaryColor: '#1a237e', videoUrl: '/background/Other/other-4.mp4' },
  { id: 'other-5', name: 'Cinematic #5', tag: 'Other', primaryColor: '#0d0d2b', videoUrl: '/background/Other/other-5.mp4' },
];

export const CHAR_ASSETS: CharAsset[] = [
  { id: 'ben-shapiro', name: 'Ben Shapiro', tag: 'Pundit', accentColor: '#2196f3', imgUrl: '/character/Ben Shapiro.webp', voiceId: 'voice-ben' },
  { id: 'gojo', name: 'Gojo', tag: 'Anime', accentColor: '#9c27b0', imgUrl: '/character/Gojo.webp', voiceId: 'voice-gojo' },
  { id: 'joe-biden', name: 'Joe Biden', tag: 'Pundit', accentColor: '#1565c0', imgUrl: '/character/Joe Biden.webp', voiceId: 'voice-biden' },
  { id: 'obama', name: 'Obama', tag: 'Pundit', accentColor: '#ef6c00', imgUrl: '/character/Obama.webp', voiceId: 'voice-obama' },
  { id: 'peter-griffin', name: 'Peter Griffin', tag: 'Cartoon', accentColor: '#795548', imgUrl: '/character/Peter Griffin.webp', voiceId: 'voice-peter' },
  { id: 'spongebob', name: 'Spongebob', tag: 'Cartoon', accentColor: '#fdd835', imgUrl: '/character/Spongebob.webp', voiceId: 'voice-spongebob' },
  { id: 'squidward', name: 'Squidward', tag: 'Cartoon', accentColor: '#00897b', imgUrl: '/character/Squiward.webp', voiceId: 'voice-squidward' },
  { id: 'stewie-griffin', name: 'Stewie Griffin', tag: 'Cartoon', accentColor: '#e53935', imgUrl: '/character/Stewie Griffin.webp', voiceId: 'voice-stewie' },
  { id: 'sukuna', name: 'Sukuna', tag: 'Anime', accentColor: '#b71c1c', imgUrl: '/character/Sukuna.webp', voiceId: 'voice-sukuna' },
  { id: 'trump', name: 'Trump', tag: 'Pundit', accentColor: '#ff6f00', imgUrl: '/character/Trump.webp', voiceId: 'voice-trump' },
];

export const VOICES = [
  { id: "voice-ben", name: "Ben Shapiro's Voice" },
  { id: "voice-gojo", name: "Gojo's Voice" },
  { id: "voice-biden", name: "Joe Biden's Voice" },
  { id: "voice-obama", name: "Obama's Voice" },
  { id: "voice-peter", name: "Peter Griffin's Voice" },
  { id: "voice-spongebob", name: "Spongebob's Voice" },
  { id: "voice-squidward", name: "Squidward's Voice" },
  { id: "voice-stewie", name: "Stewie Griffin's Voice" },
  { id: "voice-sukuna", name: "Sukuna's Voice" },
  { id: "voice-trump", name: "Trump's Voice" },
  { id: "en-US-Wavenet-D", name: "Generic Male 1" },
  { id: "en-US-Wavenet-F", name: "Generic Female 1" },
];
