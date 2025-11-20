import { GoogleGenAI, Type, Chat, GenerateImagesResponse } from "@google/genai";
import { PanelDescription, Character, Scene } from '../types';

// Initialize Gemini API with Vite environment variable
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
let chat: Chat | null = null;

// Helper function to retry API calls on rate limit errors with exponential backoff
const withRetry = async <T,>(
    apiCall: () => Promise<T>,
    retries = 3,
    delay = 2000
): Promise<T> => {
    try {
        return await apiCall();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
            retries > 0 &&
            (errorMessage.includes('429') ||
                errorMessage.toLowerCase().includes('resource_exhausted') ||
                errorMessage.toLowerCase().includes('quota exceeded'))
        ) {
            const nextDelay = delay * 2; // Exponential backoff
            console.warn(`API quota exceeded or rate limit hit. Retrying in ${nextDelay / 1000}s... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, nextDelay));
            return withRetry(apiCall, retries - 1, nextDelay);
        }
        throw error;
    }
};

const CHARACTER_EXTRACTION_PROMPT = `
You are an expert in script analysis for comic books. Your task is to identify the main characters from the provided script and generate a detailed visual description for each. This description will be used to ensure character consistency in AI-generated images. Focus on creating a unique and consistent look for each character.

The script is provided below:
---
[SCRIPT_CONTENT]
---

Output ONLY a valid JSON object. The object should have a single key "characters". The value of "characters" should be an array of objects, where each object represents a character and has two keys: "name" (the character's name) and "description" (a detailed visual description including appearance, clothing, and key features). If no characters are clearly identifiable, return an empty array. Ensure the JSON is well-formed.
`;

export const extractCharactersFromScript = async (script: string): Promise<Character[]> => {
    const prompt = CHARACTER_EXTRACTION_PROMPT.replace('[SCRIPT_CONTENT]', script);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        characters: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING }
                                },
                                required: ['name', 'description']
                            }
                        }
                    },
                    required: ['characters']
                },
            },
        });

        const jsonString = response.text;
        const parsedData = JSON.parse(jsonString);

        if (!parsedData.characters || !Array.isArray(parsedData.characters)) {
            throw new Error("Invalid character data structure received from API.");
        }

        return parsedData.characters;
    } catch (error) {
        console.error("Error extracting characters:", error);
        throw new Error("Failed to identify characters from the script.");
    }
};

const ENHANCE_CHARACTER_PROMPT = `
You are a world-class character designer for comics and animation. Your task is to take a basic character description and expand it into a highly detailed and specific "character model sheet" description. This detailed description is CRUCIAL for an AI image generator to maintain character consistency across multiple panels.

**Instructions:**
1.  Analyze the provided character name and description.
2.  Flesh out every visual detail. Be specific about facial structure, eye color and shape, hair style and color (including texture and length), body type, and posture.
3.  Describe their typical clothing in extreme detail: specify the type of garment (e.g., "a worn leather biker jacket with silver zippers"), fabric, colors (use specific color names like "cerulean blue" or "burnt sienna"), and any logos, patterns, or accessories.
4.  Mention any distinguishing features like scars, tattoos, or birthmarks.
5.  The final output should be a single, coherent paragraph of text.

**Character Name:** [CHARACTER_NAME]
**Basic Description:** [CHARACTER_DESCRIPTION]

**Output the detailed model sheet description below:**
`;

export const enhanceCharacterDescription = async (character: Character): Promise<string> => {
    const prompt = ENHANCE_CHARACTER_PROMPT
        .replace('[CHARACTER_NAME]', character.name)
        .replace('[CHARACTER_DESCRIPTION]', character.description);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error enhancing character description:", error);
        throw new Error(`Failed to enhance description for ${character.name}.`);
    }
};

const ENHANCE_SCENE_PROMPT = `
You are an expert production designer and matte painter for feature films. Your task is to take a basic scene description and expand it into a detailed and evocative "location bible" entry. This detailed description is CRITICAL for an AI image generator to maintain environmental consistency across multiple panels set in this location.

**Instructions:**
1.  Analyze the provided scene ID and description.
2.  Establish a clear mood and atmosphere.
3.  Define the lighting conditions with specifics (e.g., "harsh fluorescent light from overhead fixtures," "soft, warm afternoon sun filtering through dusty windows").
4.  Specify a distinct color palette (e.g., "dominated by muted blues and greys, with pops of neon pink").
5.  Describe key architectural elements, furniture, and props in detail. Mention materials and textures (e.g., "chipped concrete walls," "plush velvet armchairs," "gleaming chrome surfaces").
6.  The final output should be a single, coherent paragraph of text.

**Scene ID:** [SCENE_ID]
**Basic Description:** [SCENE_DESCRIPTION]

**Output the detailed location bible description below:**
`;

export const enhanceSceneDescription = async (scene: Scene): Promise<string> => {
    const prompt = ENHANCE_SCENE_PROMPT
        .replace('[SCENE_ID]', scene.id)
        .replace('[SCENE_DESCRIPTION]', scene.description);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error enhancing scene description:", error);
        throw new Error(`Failed to enhance description for ${scene.id}.`);
    }
};


const SCENE_EXTRACTION_PROMPT = `
You are an expert production designer for comic books. Your task is to identify all unique scenes from the provided script and generate a detailed visual description for each. This description will establish a consistent look and feel for each location. Focus on mood, lighting, key architectural features, and color palette.

The script is provided below:
---
[SCRIPT_CONTENT]
---

Output ONLY a valid JSON object. The object should have a single key "scenes". The value of "scenes" should be an array of objects, where each object represents a unique scene and has two keys: "id" (the scene's heading from the script, e.g., "INT. OLD LIBRARY - NIGHT") and "description" (a detailed visual description for that location). If no scenes are clearly identifiable, return an empty array. Ensure the JSON is well-formed.
`;

export const extractScenesFromScript = async (script: string): Promise<Scene[]> => {
    const prompt = SCENE_EXTRACTION_PROMPT.replace('[SCRIPT_CONTENT]', script);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    description: { type: Type.STRING }
                                },
                                required: ['id', 'description']
                            }
                        }
                    },
                    required: ['scenes']
                },
            },
        });

        const jsonString = response.text;
        const parsedData = JSON.parse(jsonString);

        if (!parsedData.scenes || !Array.isArray(parsedData.scenes)) {
            throw new Error("Invalid scene data structure received from API.");
        }

        return parsedData.scenes;
    } catch (error) {
        console.error("Error extracting scenes:", error);
        throw new Error("Failed to identify scenes from the script.");
    }
};


const SCRIPT_PARSING_PROMPT = `
You are an expert comic book artist's assistant. Your task is to analyze a comic book script and break it down into individual panels. For each panel, you must generate a detailed visual description, list the characters present, identify the scene, and determine the camera shot type.

The script is provided below:
---
[SCRIPT_CONTENT]
---

Output ONLY a valid JSON array of objects. Each object must represent a single panel and have four keys: "sceneId", "description", "characters", and "shotType".
- "sceneId": A string containing the exact scene heading (e.g., "INT. COFFEE SHOP - DAY").
- "description": A string detailing the setting, action, and mood for that specific panel. **Do not include character or scene descriptions here**, only describe what is happening in the panel.
- "characters": An array of strings, where each string is the exact name of a character present in the panel.
- "shotType": A string describing the camera perspective. Analyze the script for clues like "CLOSE UP," "WIDE SHOT," or "POV." If no shot type is specified, infer the most logical one (e.g., 'medium shot', 'establishing shot', 'close-up on action'). Common types are: 'establishing shot', 'wide shot', 'medium shot', 'close-up', 'extreme close-up', 'over-the-shoulder shot'.

Example:
[
  {
    "sceneId": "EXT. DARK ALLEY - NIGHT",
    "description": "Rain pours down, reflecting a single flickering streetlamp. An establishing shot to set the mood.",
    "characters": [],
    "shotType": "establishing shot"
  },
  {
    "sceneId": "EXT. DARK ALLEY - NIGHT",
    "description": "Detective Miller looks down at a mysterious glowing object on the ground.",
    "characters": ["Detective Miller"],
    "shotType": "medium shot"
  },
  {
    "sceneId": "EXT. DARK ALLEY - NIGHT",
    "description": "A tight shot on the glowing object, revealing strange symbols etched into its surface.",
    "characters": [],
    "shotType": "extreme close-up"
  }
]

Ensure the JSON is well-formed.
`;

export const parseScriptIntoPanels = async (script: string): Promise<PanelDescription[]> => {
    const prompt = SCRIPT_PARSING_PROMPT.replace('[SCRIPT_CONTENT]', script);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            sceneId: {
                                type: Type.STRING,
                                description: 'The scene heading this panel belongs to.'
                            },
                            description: {
                                type: Type.STRING,
                                description: 'A detailed visual description of the comic panel.',
                            },
                            characters: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.STRING,
                                },
                                description: 'A list of character names present in the panel.'
                            },
                            shotType: {
                                type: Type.STRING,
                                description: 'The camera perspective for the panel.'
                            }
                        },
                        required: ['sceneId', 'description', 'characters', 'shotType'],
                    },
                },
            },
        });

        const jsonString = response.text;
        const parsedData = JSON.parse(jsonString);

        if (!Array.isArray(parsedData) || !parsedData.every(item => typeof item.description === 'string' && Array.isArray(item.characters) && typeof item.sceneId === 'string' && typeof item.shotType === 'string')) {
            throw new Error("Invalid data structure received from API.");
        }

        return parsedData;
    } catch (error) {
        console.error("Error parsing script:", error);
        throw new Error("Failed to parse the script. The script might be too complex or the format is not recognized.");
    }
};

export const generateImageForPanel = async (
    panelDescription: string,
    characterDescriptions: string[],
    sceneDescription: string,
    stylePrompt: string,
    aspectRatio: '1:1' | '3:4' | '4:3',
    shotType?: string
): Promise<string> => {

    const shotTypeString = shotType ? `Shot Type: "${shotType}".` : '';
    const sceneString = `Scene Environment: "${sceneDescription}". This description must be followed exactly for visual consistency.`;
    let characterString = '';
    if (characterDescriptions.length > 0) {
        characterString = `Characters present (must be visually consistent with descriptions): ${characterDescriptions.join(' ')}.`;
    }

    const fullPrompt = `A comic book panel in the art style of "${stylePrompt}". ${shotTypeString} The main action of the panel is: "${panelDescription}". ${sceneString} ${characterString} Do not include text or speech bubbles.`;

    try {
        const apiCall = () => ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: aspectRatio,
            },
        });

        // Fix: Explicitly type the response from withRetry.
        const response = await withRetry<GenerateImagesResponse>(apiCall);

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        } else {
            throw new Error("No image was generated.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        const originalMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate an image for the description: "${panelDescription}". Reason: ${originalMessage}`);
    }
};

export const generateCoverImage = async (scriptSummary: string, stylePrompt: string): Promise<string> => {
    const fullPrompt = `Generate a captivating, text-free comic book cover for a story with the following summary: "${scriptSummary}". The art style should be: ${stylePrompt}. The cover must be dynamic, visually striking, and suitable for a title page. DO NOT include any words, titles, or text on the image.`;

    try {
        const apiCall = () => ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '3:4', // Standard comic cover aspect ratio
            },
        });

        // Fix: Explicitly type the response from withRetry.
        const response = await withRetry<GenerateImagesResponse>(apiCall);

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        } else {
            throw new Error("No cover image was generated.");
        }
    } catch (error) {
        console.error("Error generating cover image:", error);
        const originalMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate a cover image. Reason: ${originalMessage}`);
    }
};


const PAGE_LAYOUT_PROMPT = `
You are a master comic book layout artist. Your task is to group a series of comic book panels into pages and suggest a layout for each page.
A typical comic book page has between 2 and 6 panels. Analyze the panel descriptions to create a logical and dynamic reading flow.

The list of panel descriptions is provided below (as a JSON array of strings):
---
[PANEL_DESCRIPTIONS]
---

Output ONLY a valid JSON array of page objects. Each page object must have two keys: "panel_indices" and "layout".
- "panel_indices": An array of numbers, where each number is the zero-based index of the panel from the original list.
- "layout": A string representing the panel arrangement on the page. You MUST choose one of the following predefined layout strings: '2x1', '1x2', '2x2', '3_strip_vertical', '2_over_1', '1_over_2'.

Example of a valid output for 5 panels:
[
  {
    "panel_indices": [0, 1],
    "layout": "1x2"
  },
  {
    "panel_indices": [2, 3, 4],
    "layout": "2_over_1"
  }
]

Ensure the JSON is well-formed and that every panel index from the input is used exactly once across all pages.
`;

export const layoutPanelsIntoPages = async (panelDescriptions: string[]): Promise<{ panel_indices: number[]; layout: string; }[]> => {
    const prompt = PAGE_LAYOUT_PROMPT.replace('[PANEL_DESCRIPTIONS]', JSON.stringify(panelDescriptions));
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            panel_indices: {
                                type: Type.ARRAY,
                                items: { type: Type.INTEGER }
                            },
                            layout: { type: Type.STRING }
                        },
                        required: ['panel_indices', 'layout']
                    }
                }
            }
        });
        const jsonString = response.text;
        const parsedData = JSON.parse(jsonString);

        if (!Array.isArray(parsedData) || !parsedData.every(p => Array.isArray(p.panel_indices) && typeof p.layout === 'string')) {
            throw new Error("Invalid page layout data structure received from API.");
        }

        return parsedData;

    } catch (error) {
        console.error("Error creating page layouts:", error);
        throw new Error("Failed to create comic book page layouts.");
    }
}


export const getChatResponse = async (message: string): Promise<string> => {
    if (!chat) {
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are a friendly and helpful assistant specializing in comic books and storytelling.',
            },
        });
    }

    try {
        const response = await chat.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Error getting chat response:", error);
        throw new Error("Sorry, I'm having trouble responding right now.");
    }
};