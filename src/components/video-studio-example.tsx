/**
 * Example component demonstrating full integration of TTS + Render Job API.
 * Shows how to:
 * 1. Generate speech via the TTS API
 * 2. Create render jobs
 * 3. Poll for job progress
 * 4. Display results
 *
 * Usage: Copy this pattern for your main studio/editor component.
 */

'use client';

import React, { useState } from 'react';
import { consola } from 'consola';
import { generateSpeech, createRenderJob, ScriptLine, RenderJobRequest } from '@/lib/api-client';
import { useRenderJob } from '@/hooks/use-render-job';

export interface VideoStudioProps {
    initialScript?: ScriptLine[];
}

export function VideoStudioExample({ initialScript = [] }: VideoStudioProps) {
    // State for script input
    const [script, setScript] = useState<ScriptLine[]>(initialScript);
    const [scriptText, setScriptText] = useState('');

    // State for render parameters
    const [bgId, setBgId] = useState('mine-1');
    const [format, setFormat] = useState<'9:16' | '16:9' | '1:1'>('9:16');
    const [duration, setDuration] = useState(30);
    const [voiceLeft, setVoiceLeft] = useState('en-US-Wavenet-D');
    const [voiceRight, setVoiceRight] = useState('en-US-Wavenet-F');

    // Render job management hook
    const {
        job,
        isLoading,
        isPolling,
        error,
        progress,
        createJob: createRenderJobHook,
        resetJob,
    } = useRenderJob({
        autoPolling: true,
        pollInterval: 1000,
        onProgress: (updatedJob) => {
            consola.info(`[Render] ${updatedJob.phase} - ${updatedJob.progress}%`);
        },
        onComplete: (completedJob) => {
            consola.success(`[Render] Completed! Output: ${completedJob.outputUrl}`);
        },
        onError: (err) => {
            consola.error(`[Render] Error: ${err.message}`);
        },
    });

    // State for TTS testing
    const [ttsText, setTtsText] = useState('Hello, this is a test of the text-to-speech system.');
    const [ttsLoading, setTtsLoading] = useState(false);
    const [ttsAudio, setTtsAudio] = useState<Blob | null>(null);

    // Parse script from plain text (e.g., "Left: Hello\nRight: Hi there")
    const parseScript = (text: string): ScriptLine[] => {
        return text
            .split('\n')
            .map((line) => {
                const match = line.match(/^(left|right|Left|Right):\s*(.+)$/i);
                if (match) {
                    return {
                        speaker: (match[1].toLowerCase() as 'left' | 'right'),
                        text: match[2].trim(),
                    };
                }
                return null;
            })
            .filter((line): line is ScriptLine => line !== null);
    };

    // Handle script parsing
    const handleParseScript = () => {
        const parsed = parseScript(scriptText);
        if (parsed.length === 0) {
            alert('No valid script lines found. Format: "Left: text" or "Right: text"');
            return;
        }
        setScript(parsed);
        consola.success(`Parsed ${parsed.length} script lines`);
    };

    // Test TTS endpoint
    const handleTestTTS = async () => {
        if (!ttsText.trim()) {
            alert('Please enter text for TTS');
            return;
        }

        try {
            setTtsLoading(true);
            const blob = await generateSpeech({ text: ttsText });
            setTtsAudio(blob);
            consola.success('TTS generated successfully!');
        } catch (err) {
            consola.error('TTS failed:', err);
            alert(`TTS Error: ${err instanceof Error ? err.message : 'Unknown'}`);
        } finally {
            setTtsLoading(false);
        }
    };

    // Create render job
    const handleCreateRenderJob = async () => {
        if (script.length === 0) {
            alert('Please create a script first');
            return;
        }

        try {
            const request: RenderJobRequest = {
                script,
                bgId,
                format,
                duration,
                voiceLeft,
                voiceRight,
                leftCharId: 'peter-griffin',
                rightCharId: 'stewie-griffin',
            };

            await createRenderJobHook(request);
            consola.success('Render job created!');
        } catch (err) {
            consola.error('Failed to create render job:', err);
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8">
                    Faceless Video Studio
                </h1>

                {/* Script Input Section */}
                <div className="bg-slate-700 rounded-lg p-6 mb-6">
                    <h2 className="text-2xl font-semibold text-white mb-4">
                        1. Create Script
                    </h2>
                    <p className="text-slate-300 mb-3">
                        Format: "Left: text" or "Right: text" on separate lines
                    </p>
                    <textarea
                        className="w-full h-32 bg-slate-600 text-white rounded p-3 font-mono mb-3 border border-slate-500"
                        placeholder="Left: Hello there!&#10;Right: Hi, how are you?&#10;Left: I'm doing great!"
                        value={scriptText}
                        onChange={(e) => setScriptText(e.target.value)}
                    />
                    <button
                        onClick={handleParseScript}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold transition"
                    >
                        Parse Script
                    </button>

                    {script.length > 0 && (
                        <div className="mt-4 p-3 bg-green-900 rounded border border-green-700">
                            <p className="text-green-100">
                                ✓ Parsed {script.length} script lines:
                            </p>
                            <ul className="mt-2 space-y-1 text-green-200 text-sm">
                                {script.map((line, i) => (
                                    <li key={i}>
                                        <strong>[{line.speaker.toUpperCase()}]</strong> {line.text.substring(0, 50)}
                                        {line.text.length > 50 ? '...' : ''}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* TTS Testing Section */}
                <div className="bg-slate-700 rounded-lg p-6 mb-6">
                    <h2 className="text-2xl font-semibold text-white mb-4">
                        2. Test TTS Service
                    </h2>
                    <input
                        type="text"
                        className="w-full bg-slate-600 text-white rounded p-3 font-mono mb-3 border border-slate-500"
                        placeholder="Enter text to synthesize..."
                        value={ttsText}
                        onChange={(e) => setTtsText(e.target.value)}
                    />
                    <button
                        onClick={handleTestTTS}
                        disabled={ttsLoading}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded font-semibold transition"
                    >
                        {ttsLoading ? 'Generating...' : 'Generate Speech'}
                    </button>

                    {ttsAudio && (
                        <div className="mt-4 p-3 bg-green-900 rounded border border-green-700">
                            <p className="text-green-100 mb-2">✓ TTS Generated OK!</p>
                            <audio
                                controls
                                src={URL.createObjectURL(ttsAudio)}
                                className="w-full"
                            />
                            <p className="text-green-200 text-sm mt-2">
                                Size: {(ttsAudio.size / 1024).toFixed(2)}KB
                            </p>
                        </div>
                    )}
                </div>

                {/* Render Parameters Section */}
                <div className="bg-slate-700 rounded-lg p-6 mb-6">
                    <h2 className="text-2xl font-semibold text-white mb-4">
                        3. Render Parameters
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-slate-300 text-sm mb-2">
                                Background
                            </label>
                            <select
                                value={bgId}
                                onChange={(e) => setBgId(e.target.value)}
                                className="w-full bg-slate-600 text-white rounded p-2 border border-slate-500"
                            >
                                <option value="mine-1">Minecraft 1</option>
                                <option value="ss-1">Subway Surfers 1</option>
                                <option value="other-1">Other 1</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-300 text-sm mb-2">
                                Format
                            </label>
                            <select
                                value={format}
                                onChange={(e) => setFormat(e.target.value as any)}
                                className="w-full bg-slate-600 text-white rounded p-2 border border-slate-500"
                            >
                                <option value="9:16">9:16 (Shorts/Reels)</option>
                                <option value="16:9">16:9 (YouTube)</option>
                                <option value="1:1">1:1 (Instagram)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-300 text-sm mb-2">
                                Duration (seconds)
                            </label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                min="5"
                                max="300"
                                className="w-full bg-slate-600 text-white rounded p-2 border border-slate-500"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-300 text-sm mb-2">
                                Voice (Left)
                            </label>
                            <select
                                value={voiceLeft}
                                onChange={(e) => setVoiceLeft(e.target.value)}
                                className="w-full bg-slate-600 text-white rounded p-2 border border-slate-500"
                            >
                                <option value="en-US-Wavenet-D">David (US ♂)</option>
                                <option value="en-US-Wavenet-F">Fiona (US ♀)</option>
                                <option value="en-GB-Wavenet-B">Ben (UK ♂)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Render Job Section */}
                <div className="bg-slate-700 rounded-lg p-6 mb-6">
                    <h2 className="text-2xl font-semibold text-white mb-4">
                        4. Generate Video
                    </h2>
                    <button
                        onClick={handleCreateRenderJob}
                        disabled={isLoading || script.length === 0}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-8 py-3 rounded font-semibold transition text-lg"
                    >
                        {isLoading ? 'Creating Job...' : 'Generate Video'}
                    </button>

                    {job && (
                        <div className="mt-6 p-4 bg-slate-600 rounded border border-slate-500">
                            <div className="mb-4">
                                <p className="text-slate-300 text-sm mb-1">Job ID:</p>
                                <p className="text-white font-mono">{job.id}</p>
                            </div>

                            <div className="mb-4">
                                <p className="text-slate-300 text-sm mb-1">Status:</p>
                                <p className="text-white font-semibold">
                                    {job.status.toUpperCase()}
                                </p>
                            </div>

                            <div className="mb-4">
                                <p className="text-slate-300 text-sm mb-1">Phase:</p>
                                <p className="text-white">{job.phase}</p>
                            </div>

                            <div className="mb-4">
                                <p className="text-slate-300 text-sm mb-2">Progress:</p>
                                <div className="w-full bg-slate-700 rounded-full h-3 border border-slate-500">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-slate-300 text-sm mt-1">{progress}%</p>
                            </div>

                            {job.outputUrl && (
                                <div className="mb-4 p-3 bg-green-900 rounded border border-green-700">
                                    <p className="text-green-100 font-semibold mb-2">
                                        ✓ Video Ready!
                                    </p>
                                    <a
                                        href={job.outputUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-300 hover:text-green-200 underline"
                                    >
                                        {job.outputUrl}
                                    </a>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-900 rounded border border-red-700">
                                    <p className="text-red-100 font-semibold">Error:</p>
                                    <p className="text-red-200 text-sm">{error.message}</p>
                                </div>
                            )}

                            <button
                                onClick={resetJob}
                                className="mt-4 bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm transition"
                            >
                                Reset
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VideoStudioExample;
