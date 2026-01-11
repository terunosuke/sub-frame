import { useMemo } from 'react';
import type { ScaffoldingConfig, CalculationResults, ValidationResults, MaterialItem } from '../types';
import { WEIGHT_DICT } from '../constants';

/**
 * 文字列形式のレベル指定（例: "1,3,5"）を数値の配列に変換するユーティリティ関数。
 * @param levelsStr - カンマ区切りのレベル文字列。
 * @returns - 数値の配列。
 */
const parseLevels = (levelsStr: string): number[] => {
    if (!levelsStr) return [];
    return levelsStr.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
};

// 敷板
const calculateFloorPlates = (
    spanLengths: { [key: number]: number },
    faceColumns: number
): { total: number; result: { [key: string]: number } } => {
    // スパン方向の全長（1列分）
    const spanMmTotal = Object.entries(spanLengths).reduce((sum, [length, count]) => {
        return sum + parseInt(length) * count;
    }, 0);

    // --- まず1列ぶんの割り当てを計算 ---
    const perLineResult: { [key: string]: number } = {
        "敷板（4m）": 0,
        "敷板（3m）": 0,
        "敷板（2m）": 0,
    };

    let remaining = spanMmTotal;
    const boardSizes: [number, string][] = [
        [4000, "敷板（4m）"],
        [3000, "敷板（3m）"],
        [2000, "敷板（2m）"],
    ];

    for (const [size, label] of boardSizes) {
        const count = Math.floor(remaining / size);
        perLineResult[label] = count;
        remaining -= size * count;
    }

    if (remaining > 0) {
        perLineResult["敷板（2m）"] += 1;
    }

    // --- 各列に同じ構成で敷く → (列数 + 1) 倍 ---
    const result: { [key: string]: number } = {
        "敷板（4m）": perLineResult["敷板（4m）"] * (faceColumns + 1),
        "敷板（3m）": perLineResult["敷板（3m）"] * (faceColumns + 1),
        "敷板（2m）": perLineResult["敷板（2m）"] * (faceColumns + 1),
    };

    return {
        total: spanMmTotal,
        result
    };
};

/**
 * 足場設定オブジェクトを受け取り、部材リストや重量などの計算結果と、
 * 入力値の妥当性検証結果を返すカスタムフック。
 * configオブジェクトが変更された場合のみ再計算を実行する。
 * @param config - ユーザーが入力した足場の設定。
 * @returns results (計算結果) と validation (検証結果) を含むオブジェクト。
 */

export const useScaffoldingCalculator = (config: ScaffoldingConfig): { results: CalculationResults, validation: ValidationResults } => {
    return useMemo(() => {
        // --- 1. 基本情報の計算 ---
        // スパン方向の合計スパン数を計算
        const spanTotal = config.span600 + config.span900 + config.span1200 + config.span1500 + config.span1800;
        // スパン方向の合計スパン長さを計算（枠組足場用の寸法）
        const spanLengths: { [key: number]: number } = {
            600: config.span600,
            900: config.span900,
            1200: config.span1200,
            1500: config.span1500,
            1800: config.span1800,
        };

        const frameCols = config.frameCols || {};

        // 敷板
        const faceColTotal = Object.values(config.frameCols || {}).reduce((sum, val) => sum + val, 0);
        const { total: spanMmTotal, result: floorPlateItems } = calculateFloorPlates(spanLengths, faceColTotal);

        // 足場の総高さを計算（枠組足場用の高さ）
        const totalHeight = config.heightMode === 'all1700'
            ? config.levelCount * 1700 // 全段1700mmの場合
            : config.customHeights.reduce((sum, item) => sum + (item.height * item.count), 0); // カスタム指定の場合
        
        // ジャッキベースの必要数を計算（ジャッキベースが必要な場合のみ）
        const jackBaseCount = config.jackBaseMode !== 'none' ? (spanTotal + 1) * (faceColTotal + 1) : 0;
        
        // --- 2. 入力値の妥当性検証 ---
        const totalCustomLevels = config.customHeights.reduce((sum, item) => sum + item.count, 0);
        const customHeightStatus = totalCustomLevels < config.levelCount ? 'under' : totalCustomLevels > config.levelCount ? 'over' : 'ok';
        
        // 枠組足場では支柱構成の検証は不要
        const pillarHeightStatus = 'ok';
        const totalPillarHeight = 0;

        const jackBaseProvided = config.sb20Count + config.sb40Count;
        const jackBaseStatus = config.jackBaseOption === 'custom' 
            ? (jackBaseProvided < jackBaseCount ? 'under' : jackBaseProvided > jackBaseCount ? 'over' : 'ok') 
            : 'ok';
            
        // 枠組足場では支柱構成なし
        const pillarText = "枠組足場（支柱構成なし）";

        const validation: ValidationResults = {
            customHeightStatus,
            remainingLevels: config.levelCount - totalCustomLevels,
            pillarHeightStatus,
            totalPillarHeight,
            jackBaseStatus,
            jackBaseNeeded: jackBaseCount,
            jackBaseProvided
        };

        // --- 3. 部材数量の計算 ---
        // 部材名と数量を格納するオブジェクト
        const coefsCombined: { [key: string]: number } = {};

        // アンチの設置段を解決
        let antiLevelsResolved: number[];
        if (config.antiMode === 'all') antiLevelsResolved = Array.from({ length: config.levelCount }, (_, i) => i + 1);
        else if (config.antiMode === 'notBottom') antiLevelsResolved = Array.from({ length: Math.max(0, config.levelCount - 1) }, (_, i) => i + 2);
        else antiLevelsResolved = parseLevels(config.antiLevels);

        // 巾木の設置段を解決
        let toeboardLevelsResolved: number[];
        if (config.toeboardMode === 'all') toeboardLevelsResolved = Array.from({ length: config.levelCount }, (_, i) => i + 1);
        else if (config.toeboardMode === 'sameAsAnti') toeboardLevelsResolved = antiLevelsResolved;
        else toeboardLevelsResolved = parseLevels(config.toeboardLevels);

        // 階段の設置段を解決
        let stairLevelsResolved: number[];
        if (config.stairMode === 'none') stairLevelsResolved = [];
        else if (config.stairMode === 'notTop') stairLevelsResolved = Array.from({ length: Math.max(0, config.levelCount - 1) }, (_, i) => i + 1);
        else stairLevelsResolved = parseLevels(config.stairLevels);

        // 各カテゴリの部材を一時的に格納するオブジェクト
        const frame_items: { [key: string]: number } = {}; // 建枠
        const anti_items: { [key: string]: number } = {};
        const toeboard_items: { [key: string]: number } = {};
        const handrail_items: { [key: string]: number } = {}; // 下さん
        const brace_items: { [key: string]: number } = {}; // ブレス

        // --- 建枠の計算 ---
        // 高さごとの段数を集計
        const heightCounts: { [height: number]: number } = {};
        if (config.heightMode === 'all1700') {
            heightCounts[1700] = config.levelCount;
        } else {
            config.customHeights.forEach(item => {
                heightCounts[item.height] = (heightCounts[item.height] || 0) + item.count;
            });
        }

        // 建枠の計算（幅×高さで分類）
        for (const [width, colCount] of Object.entries(frameCols)) {
            if (colCount === 0) continue;
            for (const [height, levelCount] of Object.entries(heightCounts)) {
                if (levelCount === 0) continue;
                const key = `建枠（${width}/${height}）`;
                frame_items[key] = colCount * (spanTotal + 1) * levelCount;
            }
        }

        // --- ブレス（筋交）の計算 ---
        // スパン×高さごとに計算（両面なので列数+1）
        for (const [length, spanCount] of Object.entries(spanLengths)) {
            if (spanCount === 0) continue;
            const len = parseInt(length);
            
            for (const [height, levelCount] of Object.entries(heightCounts)) {
                if (levelCount === 0) continue;
                const key = `ブレス（${height}/${len}）`;
                brace_items[key] = (brace_items[key] || 0) + (faceColTotal + 1) * spanCount * levelCount;
            }
        }

        // --- アンチの計算 ---
        for (const [length, count] of Object.entries(spanLengths)) {
            if (count === 0) continue;
            const len = parseInt(length);
            
            // スパン×枠幅クロスでアンチ枚数を算出
            const frameAnti = {
                "40": frameCols["450"] || 0,
                "50": (frameCols["600"] || 0) + (frameCols["900"] || 0) + (frameCols["1200"] || 0) * 2,
                "24": frameCols["900"] || 0,
            };

            for (const type of ["40", "50", "24"]) {
                const perSpanCount = frameAnti[type];
                if (perSpanCount === 0) continue;
                const key = `アンチ（${type}/${len}）`;
                anti_items[key] = (anti_items[key] || 0) + perSpanCount * count * antiLevelsResolved.length;
            }

            // 巾木の計算（足元選択に応じて係数を変更）
            let toeboardMultiplier = 1; // デフォルト（片面）
            if (config.footingType === 'bothSideToeboard' || config.footingType === 'bothSideToeboardAndHandrail') {
                toeboardMultiplier = 2; // 両面巾木
            } else if (config.footingType === 'bothSideHandrail') {
                toeboardMultiplier = 0; // 両面下桟のみの場合は巾木なし
            }
            if (toeboardMultiplier > 0) {
                toeboard_items[`巾木（${len}）`] = (toeboard_items[`巾木（${len}）`] || 0) + count * toeboardLevelsResolved.length * toeboardMultiplier;
            }

            // 下桟の計算（足元選択に応じて係数を変更）
            let handrailMultiplier = 1; // デフォルト（片面）
            if (config.footingType === 'bothSideToeboardAndHandrail' || config.footingType === 'bothSideHandrail') {
                handrailMultiplier = 2; // 両面下桟
            } else if (config.footingType === 'bothSideToeboard') {
                handrailMultiplier = 0; // 両面巾木のみの場合は下桟なし
            }
            if (handrailMultiplier > 0) {
                handrail_items[`長手下桟（${len}）`] = (handrail_items[`長手下桟（${len}）`] || 0) + count * toeboardLevelsResolved.length * handrailMultiplier;
            }
        }
        
        // その他の独立した部材の計算

        const stair_count = config.stairSpanCount * stairLevelsResolved.length; // 階段（設置スパン数×設置段数）
        
        // 壁つなぎの計算
        const wallTie_items: { [key: string]: number } = {};
        if (config.wallTieMode !== 'none') {
            // 設置段数の計算
            let wallTieLevels = 0;
            if (config.wallTieLevelMode === 'all') {
                wallTieLevels = config.levelCount;
            } else if (config.wallTieLevelMode === 'alternate') {
                wallTieLevels = Math.ceil(config.levelCount / 2);
            } else {
                wallTieLevels = config.wallTieLevelCount;
            }

            // 1段当たりの設置数の計算
            let wallTieSpans = 0;
            if (config.wallTieSpanMode === 'all') {
                wallTieSpans = spanTotal;
            } else if (config.wallTieSpanMode === 'alternate') {
                wallTieSpans = Math.ceil((spanTotal + 1) / 2);
            } else {
                wallTieSpans = config.wallTieSpanCount;
            }

            const totalWallTies = wallTieLevels * wallTieSpans;
            if (totalWallTies > 0) {
                wallTie_items[config.wallTieMode] = totalWallTies;
            }
        }

        // 層間養生ネットの計算
        const layerNet_items: { [key: string]: number } = {};
        if (config.layerNetMode === 'required') {
            // 設置段数の計算
            let layerNetLevels = 0;
            if (config.layerNetLevelMode === 'all') {
                layerNetLevels = config.levelCount;
            } else if (config.layerNetLevelMode === 'alternate') {
                layerNetLevels = Math.ceil(config.levelCount / 2);
            } else {
                layerNetLevels = config.layerNetLevelCount;
            }

            if (layerNetLevels > 0) {
                // 層間ネットの総数 = 段数 × (スパン長 ÷ 5.5) ※小数点以下切り上げ
                const layerNetCount = layerNetLevels * Math.ceil(spanMmTotal / 5500);
                // 層間ネットブラケットの総数 = 段数 × (スパン総数 + 1)
                const layerNetBracketCount = layerNetLevels * (spanTotal + 1);

                if (layerNetCount > 0) layerNet_items['層間ネット'] = layerNetCount;
                if (layerNetBracketCount > 0) layerNet_items['層間ネットブラケット'] = layerNetBracketCount;
            }
        }

        // 外周シートの計算
        const perimeterSheet_items: { [key: string]: number } = {};
        if (config.perimeterSheetMode === 'required') {
            // 必要段数の計算
            let perimeterSheetLevels = 0;
            if (config.perimeterSheetLevelMode === 'all') {
                perimeterSheetLevels = config.levelCount;
            } else {
                perimeterSheetLevels = config.perimeterSheetLevelCount;
            }

            if (perimeterSheetLevels > 0) {
                // 3段/1枚として計算（切り上げ）
                const sheetsPerSpan = Math.ceil(perimeterSheetLevels / 3);

                // スパン長さごとにメッシュシートを計算
                for (const [length, count] of Object.entries(spanLengths)) {
                    if (count === 0) continue;
                    const len = parseInt(length);
                    const key = `メッシュシート（${len}）`;
                    perimeterSheet_items[key] = count * sheetsPerSpan;
                }
            }
        }
        
        // 妻側手すり（1段手すりに変更）
        // アンチの設置段数と連動
        const tsumaHandrail_items: { [key: string]: number } = {};
        const tsumaSides = config.tsumaCount;
        const tsumaLevels = antiLevelsResolved.length; // アンチと同じ段数

        for (const [width, colCount] of Object.entries(frameCols)) {
            if (colCount > 0) {
                const qty = colCount * tsumaLevels * tsumaSides * 1; // アンチと同じ段数
                tsumaHandrail_items[`妻側手すり（${width}）`] = qty;
            }
        }

        // 妻側巾木
        // アンチの設置段数と連動
        const tsumaToeboard_items: { [key: string]: number } = {};
        for (const [width, colCount] of Object.entries(frameCols)) {
            if (colCount > 0) {
                const qty = colCount * tsumaLevels * tsumaSides * 1; // アンチと同じ段数
                tsumaToeboard_items[`妻側巾木（${width}）`] = qty;
            }
        }

        // 妻側シートの計算
        const tsumaSheet_items: { [key: string]: number } = {};
        if (config.tsumaSheetCount > 0) {
            // 必要段数の計算
            let tsumaSheetLevels = 0;
            if (config.tsumaSheetLevelMode === 'all') {
                tsumaSheetLevels = config.levelCount;
            } else {
                tsumaSheetLevels = config.tsumaSheetLevelCount;
            }

            if (tsumaSheetLevels > 0) {
                // 3段/1枚として計算（切り上げ）
                const sheetsPerTsuma = Math.ceil(tsumaSheetLevels / 3);

                // 枠幅ごとにメッシュシートを計算（選択された妻側の面数分）
                for (const [width, colCount] of Object.entries(frameCols)) {
                    if (colCount > 0) {
                        // 妻側メッシュは通常のメッシュシートとキーが被らないように「妻側」プレフィックスを付与
                        const key = `妻側メッシュシート（${width}）`;
                        const qty = colCount * sheetsPerTsuma * config.tsumaSheetCount;
                        tsumaSheet_items[key] = (tsumaSheet_items[key] || 0) + qty;
                    }
                }
            }
        }

        // 階段部の枠幅拡幅計算（枠幅が450/600/900で階段ありの場合）
        // ※frame_keys生成の前に実行する必要がある
        console.log('🔍 階段拡幅チェック:', {
            stairFrameWidening: config.stairFrameWidening,
            stairSpanCount: config.stairSpanCount,
            frameWidth: config.frameWidth,
            stairMode: config.stairMode
        });

        if (config.stairFrameWidening && config.stairSpanCount > 0 && config.frameWidth !== 1200) {
            console.log('✅ 階段拡幅計算を実行');

            // 階段は1800スパンとして計上されている
            // 階段1セット（2列）= 2スパン分
            const actualStairSpans = config.stairSpanCount * 2; // 階段の実際のスパン数

            // 階段2スパンには、拡張枠2本 + 1200枠3本 = 5本の枠が必要
            // 一般化すると、階段sスパンには、拡張枠s本 + 1200枠(s+1)本 = (2s+1)本の枠が必要

            // 階段部調整用拡幅わく：階段スパン数×全段数
            const wideningFrameCount = actualStairSpans * config.levelCount;
            coefsCombined["階段部調整用拡幅枠"] = wideningFrameCount;
            console.log('拡幅わく:', wideningFrameCount);

            // 建枠(1200/1700)を追加：(階段スパン数+1)×全段数
            const frame1200Count = (actualStairSpans + 1) * config.levelCount;
            frame_items["建枠（1200/1700）"] = (frame_items["建枠（1200/1700）"] || 0) + frame1200Count;
            console.log('建枠1200:', frame1200Count);

            // 元の枠幅の建枠を減らす：(拡張枠+1200枠)×全段数
            const reductionCount = (actualStairSpans + (actualStairSpans + 1)) * config.levelCount;
            const originalFrameKey = `建枠（${config.frameWidth}/1700）`;
            console.log('元の建枠を減らす:', originalFrameKey, reductionCount);
            if (frame_items[originalFrameKey]) {
                frame_items[originalFrameKey] = Math.max(0, frame_items[originalFrameKey] - reductionCount);
                console.log('減算後:', frame_items[originalFrameKey]);
            }

            // アンチの調整（枠幅900の場合のみ）
            if (config.frameWidth === 900) {
                // 階段部分のアンチを建枠900から建枠1200の構成に変更
                // 階段は1800スパンとして計上されているので、1800スパンのアンチを調整
                const stairSpan1800 = actualStairSpans; // 階段のスパン数（1800として計上）

                // アンチ24を減らす：階段スパン数×アンチ設置段数
                const anti24Key = `アンチ（24/1800）`;
                const anti24Reduction = stairSpan1800 * antiLevelsResolved.length;
                if (anti24Reduction > 0 && anti_items[anti24Key]) {
                    anti_items[anti24Key] = Math.max(0, anti_items[anti24Key] - anti24Reduction);
                }

                // アンチ50を増やす：階段スパン数×アンチ設置段数
                // （建枠1200では50を2枚使うが、元々1枚あるので追加で1枚）
                const anti50Key = `アンチ（50/1800）`;
                const anti50Addition = stairSpan1800 * antiLevelsResolved.length;
                if (anti50Addition > 0) {
                    anti_items[anti50Key] = (anti_items[anti50Key] || 0) + anti50Addition;
                }
            }
        }

        // --- 4. 結果の整形 ---

        // サイズ順ソート関数
        const sortKeysBySize = (keys: string[], label: string): string[] => {
            return keys.sort((a, b) => {
                const numA = parseInt(a.replace(/[^\d]/g, ''));
                const numB = parseInt(b.replace(/[^\d]/g, ''));
                return numA - numB;
            }).filter(key => key.includes(label));
        };

        // CSV出力時の表示順を定義するためのキーリスト
        const frame_keys = sortKeysBySize(Object.keys(frame_items), '建枠');
        const brace_keys = sortKeysBySize(Object.keys(brace_items), 'ブレス');
        const handrail_keys = sortKeysBySize(Object.keys(handrail_items), '長手下桟');
        const anti_keys = sortKeysBySize(Object.keys(anti_items), 'アンチ');
        const toeboard_keys = sortKeysBySize(Object.keys(toeboard_items), '巾木');
        const tsumaHandrail_keys = sortKeysBySize(Object.keys(tsumaHandrail_items), '妻側手すり');
        const tsumaToeboard_keys = sortKeysBySize(Object.keys(tsumaToeboard_items), '妻側巾木');

        // 各部材の表示順序
        const ordered_keys = [
            "敷板（4m）", "敷板（3m）", "敷板（2m）",
            "ジャッキベース（20）", "ジャッキベース（40）",
            "タイコ（40）", "タイコ（80）",
            ...frame_keys,
            "階段部調整用拡幅枠",
            "階段",
            ...brace_keys,
            ...anti_keys,
            ...handrail_keys,
            ...toeboard_keys,
            ...tsumaHandrail_keys,
            ...tsumaToeboard_keys,
            "KTS16", "KTS20", "KTS30", "KTS45", "KTS60", "KTS80", "KTS100",
            "層間ネット", "層間ネットブラケット",
            // 妻側メッシュシートを通常メッシュシートより前に表示
            "妻側メッシュシート（450）", "妻側メッシュシート（600）", "妻側メッシュシート（900）", "妻側メッシュシート（1200）", "妻側メッシュシート（1500）", "妻側メッシュシート（1800）",
            "メッシュシート（600）", "メッシュシート（900）", "メッシュシート（1200）", "メッシュシート（1500）", "メッシュシート（1800）"
        ];

        // 各部材の数量を`coefsCombined`に集約
        if (config.jackBaseMode !== 'none') {
            if (config.jackBaseOption === 'allSB20') coefsCombined["ジャッキベース（20）"] = jackBaseCount;
            else if (config.jackBaseOption === 'allSB40') coefsCombined["ジャッキベース（40）"] = jackBaseCount;
            else if (config.jackBaseOption === 'custom') {
                if (config.sb20Count > 0) coefsCombined["ジャッキベース（20）"] = config.sb20Count;
                if (config.sb40Count > 0) coefsCombined["ジャッキベース（40）"] = config.sb40Count;
            }
        }
        if (config.jackBaseMode === 'jackBaseWithTaiko') {
            if (config.taiko40 > 0) coefsCombined["タイコ（40）"] = config.taiko40;
            if (config.taiko80 > 0) coefsCombined["タイコ（80）"] = config.taiko80;
        }
        if (stair_count > 0) coefsCombined["階段"] = stair_count;

        // 他のカテゴリの部材をマージ
        Object.assign(
            coefsCombined,
            config.jackBaseMode !== 'none' ? floorPlateItems : {},
            frame_items,
            brace_items,
            handrail_items,
            anti_items,
            toeboard_items,
            tsumaHandrail_items,
            tsumaToeboard_items,
            wallTie_items,
            layerNet_items,
            perimeterSheet_items,
            tsumaSheet_items
        );

        // 最終的な部材リストを生成
        const final_materials: MaterialItem[] = ordered_keys
            .filter(key => coefsCombined[key] > 0)
            .map(key => {
                const quantity = Math.round(coefsCombined[key]);
                const unitWeight = WEIGHT_DICT[key] || 0;
                return {
                    name: key,
                    quantity,
                    unitWeight,
                    totalWeight: parseFloat((quantity * unitWeight).toFixed(2))
                };
            });
        
        // 全体の総重量を計算
        const totalWeight = parseFloat(final_materials.reduce((sum, item) => sum + item.totalWeight, 0).toFixed(2));

        // --- 5. 輸送手段の提案 ---
        const W = totalWeight;
        const transportUnic =
            W <= 2000 ? "✅ 4tユニック" :
            W <= 4500 ? "✅ 4t増ユニック　又は6ｔユニック" :
            W <= 6500 ? "✅ 6tユニック" :
            W <= 12000 ? "✅ 12tユニック" :
            "⚠️ 超過（車両を分割してください）";
        
        const transportFlatbed =
            W <= 4000 ? "✅ 4t平車" :
            W <= 6600 ? "✅ 6t平車" :
            W <= 12000 ? "✅ 12t平車" :
            "⚠️ 超過（車両を分割してください）";
            
        // 車両分割オプションの計算
        let splitOptions: string[] = [];
         const truck_caps = { "4tＵ": 2000, "6tＵ": 6500, "12tＵ": 12000 };
         for (let t1 = 0; t1 <= 5; t1++) {
             for (let t2 = 0; t2 <= 4; t2++) {
                 for (let t3 = 0; t3 <= 4; t3++) {
                     if (t1 + t2 + t3 === 0) continue;
                     const total_cap = t1 * truck_caps["4tＵ"] + t2 * truck_caps["6tＵ"] + t3 * truck_caps["12tＵ"];
                     if (total_cap >= W && total_cap <= W * 1.5 && total_cap <= 48000) {
                         const parts = [];
                         if (t1 > 0) parts.push(`4tＵ×${t1}`);
                         if (t2 > 0) parts.push(`6tＵ×${t2}`);
                         if (t3 > 0) parts.push(`12tＵ×${t3}`);
                         if (parts.length > 0) {
                             splitOptions.push(parts.join(" + "));
                         }
                     }
                 }
             }
         }
         splitOptions.sort((a, b) => a.length - b.length);
         // 「4tＵ×1」のように1車しか提案が無い場合は提案を表示しない（UIでエラーマークを出すため）
         if (splitOptions.length === 1) {
            const only = splitOptions[0];
            // '+' を含まず末尾が "×1" の場合を単一車両提案と見なす
            if (!only.includes('+') && /×1$/.test(only)) {
                splitOptions = [];
            }
        }
         
         // 最終的な計算結果オブジェクト
         const results: CalculationResults = {
             materials: final_materials,
             totalWeight,
             spanTotal,
             spanMmTotal,
             totalHeight,
             jackBaseCount,
             pillarText,
             transportUnic,
             transportFlatbed,
             splitOptions: splitOptions.slice(0, 15)
         };

        return { results, validation };
    }, [config]);
};