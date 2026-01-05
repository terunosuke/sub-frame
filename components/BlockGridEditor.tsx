import React, { useState } from 'react';
import type { BlockGridState } from '../types';
import { InputGroup } from './InputGroup';

interface BlockGridEditorProps {
    blockGrid: BlockGridState | null;
    setBlockGrid: (grid: BlockGridState | null) => void;
    onApplyToConfig: () => void;
    isGridApplied: boolean;
    onResetGrid: () => void;
}

// スパンサイズごとの色設定
const SPAN_COLORS = {
    600: { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', name: '600mm', color: '青' },
    900: { bg: 'bg-green-100', hover: 'hover:bg-green-200', name: '900mm', color: '緑' },
    1200: { bg: 'bg-yellow-100', hover: 'hover:bg-yellow-200', name: '1200mm', color: '黄' },
    1500: { bg: 'bg-orange-100', hover: 'hover:bg-orange-200', name: '1500mm', color: '橙' },
    1800: { bg: 'bg-red-100', hover: 'hover:bg-red-200', name: '1800mm', color: '赤' },
    stair: { bg: 'bg-red-100', hover: 'hover:bg-red-200', name: '階段', color: '赤' },
} as const;

export const BlockGridEditor: React.FC<BlockGridEditorProps> = ({
    blockGrid,
    setBlockGrid,
    onApplyToConfig,
    isGridApplied,
    onResetGrid
}) => {
    const [tempLevels, setTempLevels] = useState(4);
    const [tempSpans, setTempSpans] = useState(10);
    const [tempFrameWidth, setTempFrameWidth] = useState<450 | 600 | 900 | 1200>(900);

    // ツール選択
    const [selectedTool, setSelectedTool] = useState<'span' | 'anti'>('span');
    const [selectedSpan, setSelectedSpan] = useState<600 | 900 | 1200 | 1500 | 1800 | 'stair'>(1800);
    const [antiEnabled, setAntiEnabled] = useState<boolean>(true); // true=アンチあり, false=アンチなし

    // グリッド初期化
    const initGrid = () => {
        const spanSizes = Array.from({ length: tempSpans }, () => 1800); // デフォルトは1800mm
        const floors = Array.from({ length: tempLevels }, () => true); // デフォルトは全段アンチあり
        setBlockGrid({
            levels: tempLevels,
            spans: tempSpans,
            frameWidth: tempFrameWidth,
            spanSizes,
            floors,
            wideningEnabled: tempFrameWidth !== 1200 // 枠幅が1200以外ならデフォルトで拡幅推奨
        });
    };

    // セルクリック処理
    const handleCellClick = (level: number, span: number) => {
        if (!blockGrid || isGridApplied) return;

        if (selectedTool === 'span') {
            // 列全体のスパンサイズを変更
            const newSpanSizes = [...blockGrid.spanSizes];

            if (selectedSpan === 'stair') {
                // 階段は2列セット（クリックした列と次の列）
                if (span >= blockGrid.spans - 1) {
                    alert('階段は2列セットです。最後の列には設置できません。');
                    return;
                }
                newSpanSizes[span] = 'stair';
                newSpanSizes[span + 1] = 'stair';
            } else {
                // 通常のスパンサイズ
                newSpanSizes[span] = selectedSpan;
            }

            setBlockGrid({ ...blockGrid, spanSizes: newSpanSizes });
        } else {
            // 段全体のアンチ設定を変更
            const newFloors = [...blockGrid.floors];
            newFloors[level] = antiEnabled;
            setBlockGrid({ ...blockGrid, floors: newFloors });
        }
    };

    // 全クリア
    const clearAll = () => {
        if (!blockGrid) return;
        if (!confirm('グリッドをクリアしてよろしいですか？')) return;

        const spanSizes = Array.from({ length: blockGrid.spans }, () => 1800);
        const floors = Array.from({ length: blockGrid.levels }, () => true);
        setBlockGrid({
            ...blockGrid,
            spanSizes,
            floors,
            wideningEnabled: blockGrid.frameWidth !== 1200 // 枠幅に応じてリセット
        });
    };

    // サイズ変更（グリッドをリセット）
    const resetGrid = () => {
        if (!confirm('グリッドをリセットすると、現在の配置が失われます。よろしいですか？')) {
            return;
        }
        setBlockGrid(null);
    };

    return (
        <div className="space-y-4 p-4">
            {/* グリッド未作成時：サイズ設定UI */}
            {!blockGrid && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup
                            label="段数"
                            type="number"
                            value={tempLevels}
                            onChange={e => setTempLevels(parseInt(e.target.value) || 4)}
                            min={1}
                            max={100}
                        />
                        <InputGroup
                            label="スパン数（列数）"
                            type="number"
                            value={tempSpans}
                            onChange={e => setTempSpans(parseInt(e.target.value) || 10)}
                            min={1}
                            max={100}
                        />
                    </div>
                    <InputGroup
                        label="枠幅（短手方向）"
                        as="select"
                        value={tempFrameWidth}
                        onChange={e => setTempFrameWidth(parseInt(e.target.value) as 450 | 600 | 900 | 1200)}
                    >
                        <option value={450}>450mm</option>
                        <option value={600}>600mm</option>
                        <option value={900}>900mm</option>
                        <option value={1200}>1200mm</option>
                    </InputGroup>
                    <button
                        onClick={initGrid}
                        className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition duration-150"
                    >
                        グリッド作成
                    </button>
                </div>
            )}

            {/* グリッド作成済み：キャンバス表示 */}
            {blockGrid && (
                <div className="space-y-4">
                    {/* 確定済みメッセージ */}
                    {isGridApplied && (
                        <div className="text-sm text-gray-600 bg-green-50 border border-green-200 rounded p-3">
                            ✅ この形で確定済みです。変更する場合は「再編集」ボタンをクリックしてください。
                        </div>
                    )}

                    {/* グリッド表示エリア */}
                    <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-4">
                        {/* 左側：操作エリア（確定済みの場合は非表示） */}
                        {!isGridApplied && (
                            <div className="space-y-4">
                                {/* 操作方法 */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">操作方法</h4>
                                    <div className="text-xs text-gray-600 space-y-1">
                                        <p>① 長さやアンチの有無を選択 → ② マス目をクリック</p>
                                        <p>• スパン選択: 列の1マスをクリック → その列全体のスパンサイズが変わります</p>
                                        <p>• アンチ選択: 段の1マスをクリック → その段全体にアンチ（太いライン）が設定されます</p>
                                    </div>
                                </div>

                                {/* スパン設定 */}
                                <div className="bg-white border border-gray-300 rounded-lg p-3">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">🔧 スパン選択（列一括）</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {([600, 900, 1200, 1500, 1800] as const).map(size => (
                                            <button
                                                key={size}
                                                onClick={() => {
                                                    setSelectedTool('span');
                                                    setSelectedSpan(size);
                                                }}
                                                className={`
                                                    px-3 py-1.5 rounded-md font-semibold text-xs transition-all
                                                    ${selectedTool === 'span' && selectedSpan === size
                                                        ? `${SPAN_COLORS[size].bg} ring-2 ring-gray-800 text-gray-900`
                                                        : `${SPAN_COLORS[size].bg} ${SPAN_COLORS[size].hover} text-gray-700`
                                                    }
                                                `}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => {
                                                setSelectedTool('span');
                                                setSelectedSpan('stair');
                                            }}
                                            className={`
                                                px-3 py-1.5 rounded-md font-semibold text-xs transition-all
                                                ${selectedTool === 'span' && selectedSpan === 'stair'
                                                    ? `${SPAN_COLORS.stair.bg} ring-2 ring-gray-800 text-gray-900`
                                                    : `${SPAN_COLORS.stair.bg} ${SPAN_COLORS.stair.hover} text-gray-700`
                                                }
                                            `}
                                        >
                                            階段
                                        </button>
                                    </div>
                                </div>

                                {/* アンチ設定 */}
                                <div className="bg-white border border-gray-300 rounded-lg p-3">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">📐 アンチ選択（段一括）</h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedTool('anti');
                                                setAntiEnabled(true);
                                            }}
                                            className={`
                                                flex-1 px-3 py-1.5 rounded-md font-semibold text-xs transition-all
                                                ${selectedTool === 'anti' && antiEnabled
                                                    ? 'bg-gray-800 text-white ring-2 ring-gray-800'
                                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                                }
                                            `}
                                        >
                                            アンチあり
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedTool('anti');
                                                setAntiEnabled(false);
                                            }}
                                            className={`
                                                flex-1 px-3 py-1.5 rounded-md font-semibold text-xs transition-all
                                                ${selectedTool === 'anti' && !antiEnabled
                                                    ? 'bg-gray-800 text-white ring-2 ring-gray-800'
                                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                                }
                                            `}
                                        >
                                            アンチなし
                                        </button>
                                    </div>
                                </div>

                                {/* 選択中の表示 */}
                                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                                    <div className="text-xs text-gray-600">
                                        <strong>選択中:</strong>
                                        {selectedTool === 'span' && selectedSpan === 'stair' && ` 階段 (${SPAN_COLORS.stair.color}色・2列セット)`}
                                        {selectedTool === 'span' && selectedSpan !== 'stair' && ` スパン ${selectedSpan}mm (${SPAN_COLORS[selectedSpan].color}色)`}
                                        {selectedTool === 'anti' && ` アンチ${antiEnabled ? 'あり' : 'なし'}`}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 右側：プレビューエリア */}
                        <div className={isGridApplied ? "col-span-full space-y-4" : "space-y-4"}>
                            {/* 立面図 */}
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">立面図</h4>
                                <div className="overflow-x-auto">
                                    <div className="inline-block">
                                        <div className="flex items-start">
                                            {/* 段番号ラベル列（左側） */}
                                            <div className="mr-2">
                                        {/* スパン番号ラベル分の空白 */}
                                        <div className="h-5 mb-1"></div>

                                        {/* 段番号ラベル */}
                                        {Array.from({ length: blockGrid.levels }, (_, levelIndex) => {
                                            const level = blockGrid.levels - 1 - levelIndex;
                                            return (
                                                <div
                                                    key={level}
                                                    className="h-10 flex items-center justify-end text-xs text-gray-600 font-semibold pr-1"
                                                >
                                                    {level + 1}段
                                                </div>
                                            );
                                        })}
                                    </div>

                                {/* グリッド本体 */}
                                <div>
                                    {/* スパン番号ラベル（上部）+ スパンサイズ表示 */}
                                    <div className="flex mb-1 h-5">
                                        {blockGrid.spanSizes.map((size, i) => (
                                            <div
                                                key={i}
                                                className="w-10 text-center text-xs font-semibold"
                                                style={{ color: '#666' }}
                                            >
                                                {size === 'stair' ? '階段' : size}
                                            </div>
                                        ))}
                                    </div>

                                    {/* セルグリッド（上から下へ：高い段から低い段） */}
                                    {Array.from({ length: blockGrid.levels }, (_, levelIndex) => {
                                        const level = blockGrid.levels - 1 - levelIndex; // 逆順（上が高い段）
                                        const hasFloor = blockGrid.floors[level];

                                        return (
                                            <div key={level} className="flex">
                                                {blockGrid.spanSizes.map((spanSize, span) => {
                                                    const colorConfig = SPAN_COLORS[spanSize as keyof typeof SPAN_COLORS] || SPAN_COLORS[1800];

                                                    return (
                                                        <div
                                                            key={span}
                                                            onClick={() => handleCellClick(level, span)}
                                                            className={`
                                                                w-10 h-10 border border-gray-300 transition-all duration-150 select-none
                                                                ${isGridApplied ? '' : 'cursor-pointer'}
                                                                ${colorConfig.bg}
                                                                ${isGridApplied ? '' : colorConfig.hover}
                                                                ${hasFloor ? 'border-b-4 border-b-gray-800' : ''}
                                                            `}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>

                        {/* 平面図 */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">平面図</h4>
                            <div className="overflow-x-auto">
                                <div className="inline-block">
                                    <div className="flex items-start">
                                        {/* 枠幅表示（縦方向・左側） */}
                                        <div className="flex flex-col items-center justify-center" style={{ minHeight: '48px', marginRight: '22px' }}>
                                            <div className="text-xs text-gray-600 font-semibold leading-none">
                                                ↑
                                            </div>
                                            <div className="text-xs text-gray-600 font-semibold leading-none" style={{ writingMode: 'vertical-rl' }}>
                                                {blockGrid.frameWidth}
                                            </div>
                                            <div className="text-xs text-gray-600 font-semibold leading-none">
                                                ↓
                                            </div>
                                        </div>

                                        {/* 平面グリッド（スパンのみ表示） */}
                                        <div>
                                            {/* 平面グリッド */}
                                            <div className="flex border-2 border-gray-400">
                                                {blockGrid.spanSizes.map((spanSize, i) => {
                                                    const colorConfig = SPAN_COLORS[spanSize as keyof typeof SPAN_COLORS] || SPAN_COLORS[1800];

                                                    // 拡幅対象かどうかを判定
                                                    const isWidened = blockGrid.wideningEnabled && blockGrid.frameWidth !== 1200 && (
                                                        spanSize === 'stair' ||
                                                        (i > 0 && blockGrid.spanSizes[i - 1] === 'stair') ||
                                                        (i < blockGrid.spanSizes.length - 1 && blockGrid.spanSizes[i + 1] === 'stair')
                                                    );

                                                    // 拡幅エリアの右端かどうか
                                                    const isWideningRightEdge = isWidened && (
                                                        i === blockGrid.spanSizes.length - 1 ||
                                                        !(blockGrid.spanSizes[i + 1] === 'stair' ||
                                                          (i + 1 > 0 && blockGrid.spanSizes[i] === 'stair') ||
                                                          (i + 2 < blockGrid.spanSizes.length && blockGrid.spanSizes[i + 2] === 'stair'))
                                                    );

                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`
                                                                w-10 h-12 border border-gray-300 flex items-center justify-center
                                                                ${colorConfig.bg}
                                                                ${isWidened ? 'border-t-2 border-b-2 border-l-2 border-t-orange-500 border-b-orange-500 border-l-orange-500' : ''}
                                                                ${isWideningRightEdge ? 'border-r-2 border-r-orange-500' : ''}
                                                            `}
                                                        >
                                                            <span className="text-xs font-semibold text-gray-700">
                                                                {spanSize === 'stair' ? '階' : spanSize === 1800 ? '18' : spanSize === 1500 ? '15' : spanSize === 1200 ? '12' : spanSize === 900 ? '9' : '6'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* 拡幅情報（下部に表示） */}
                                            {blockGrid.wideningEnabled && blockGrid.frameWidth !== 1200 && (
                                                <div className="flex mt-1">
                                                    {blockGrid.spanSizes.map((spanSize, i) => {
                                                        // 階段セルとその前後1列ずつが拡幅対象
                                                        const isStairOrAdjacent =
                                                            spanSize === 'stair' ||
                                                            (i > 0 && blockGrid.spanSizes[i - 1] === 'stair') ||
                                                            (i < blockGrid.spanSizes.length - 1 && blockGrid.spanSizes[i + 1] === 'stair');

                                                        return (
                                                            <div key={i} className="w-10 text-center">
                                                                {isStairOrAdjacent && (
                                                                    <span className="text-[10px] text-orange-600 font-bold">
                                                                        1200
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 階段がある場合で枠幅が1200以外の時、拡幅オプション表示（平面図の下） */}
                        {blockGrid.spanSizes.includes('stair') && blockGrid.frameWidth !== 1200 && !isGridApplied && (
                            <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mt-3">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={blockGrid.wideningEnabled}
                                        onChange={e => setBlockGrid({ ...blockGrid, wideningEnabled: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm font-semibold text-gray-700">
                                        階段部のみ枠幅1200mmに拡幅する（推奨）
                                    </span>
                                </label>
                                <p className="text-xs text-gray-600 mt-1 ml-6">
                                    ※階段の前後2列ずつ（計4列）が1200mm枠に変更されます
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 操作ボタン */}
                <div className="flex gap-2 flex-wrap">
                    {isGridApplied ? (
                        <button
                            onClick={onResetGrid}
                            className="py-2 px-4 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 transition duration-150"
                        >
                            再編集
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={clearAll}
                                className="py-2 px-4 bg-gray-500 text-white font-semibold rounded-md hover:bg-gray-600 transition duration-150"
                            >
                                選択クリア
                            </button>
                            <button
                                onClick={resetGrid}
                                className="py-2 px-4 bg-gray-500 text-white font-semibold rounded-md hover:bg-gray-600 transition duration-150"
                            >
                                スパン・段数の変更
                            </button>
                            <button
                                onClick={onApplyToConfig}
                                className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition duration-150"
                            >
                                この形で確定
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}
        </div>
    );
}
