import React from 'react';
import type { ScaffoldingConfig, CustomHeight, ValidationResults, BlockGridState } from '../types';
import { Card } from './Card';
import { InputGroup } from './InputGroup';
import { Alert } from './Alert';
import { AIPdfExtractor } from './AIPdfExtractor';
import { BlockGridEditor } from './BlockGridEditor';

interface InputFormProps {
    config: ScaffoldingConfig;
    setConfigField: <K extends keyof ScaffoldingConfig>(field: K, value: ScaffoldingConfig[K]) => void;
    setCustomHeights: (heights: CustomHeight[]) => void;
    setPillarSelection: (length: number, count: number) => void;
    validation: ValidationResults;
    isAnalyzing: boolean;
    analysisError: string | null;
    analysisSuccess: string | null;
    onAnalyzeFile: (file: File, prompt: string) => void;
    blockGrid: BlockGridState | null;
    setBlockGrid: (grid: BlockGridState | null) => void;
    onApplyBlockGrid: () => void;
    isGridApplied: boolean;
    onResetGrid: () => void;
}

export const InputForm: React.FC<InputFormProps> = ({
    config, setConfigField, setCustomHeights, setPillarSelection, validation,
    isAnalyzing, analysisError, analysisSuccess, onAnalyzeFile,
    blockGrid, setBlockGrid, onApplyBlockGrid, isGridApplied, onResetGrid
}) => {
    const [inputAssistMode, setInputAssistMode] = React.useState<'draw' | 'image' | 'manual' | null>(null);

    const handleCustomHeightChange = (index: number, field: keyof CustomHeight, value: number) => {
        const newHeights = [...config.customHeights];
        newHeights[index] = { ...newHeights[index], [field]: value };
        setCustomHeights(newHeights);
    };

    const addCustomHeightRow = () => {
        setCustomHeights([...config.customHeights, { height: 1700, count: 1 }]);
    };

    const removeCustomHeightRow = (index: number) => {
        setCustomHeights(config.customHeights.filter((_, i) => i !== index));
    };

    const totalHeight = config.heightMode === 'all1700'
        ? config.levelCount * 1700
        : config.customHeights.reduce((sum, item) => sum + (item.height * item.count), 0);

    return (
        <div className="space-y-6">
            {/* 最上段：入力補助を利用する */}
            <Card title="入力補助を利用する（任意）" defaultOpen>
                <div className="p-4 space-y-4">
                    {/* トグルボタン */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setInputAssistMode('draw')}
                            className={`
                                flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all
                                ${inputAssistMode === 'draw'
                                    ? 'bg-green-600 text-white ring-2 ring-green-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }
                            `}
                        >
                            A. 絵を描く
                        </button>
                        <button
                            onClick={() => setInputAssistMode('image')}
                            className={`
                                flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all
                                ${inputAssistMode === 'image'
                                    ? 'bg-green-600 text-white ring-2 ring-green-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }
                            `}
                        >
                            B. 図面/画像を読み込む
                        </button>
                        <button
                            onClick={() => setInputAssistMode('manual')}
                            className={`
                                flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all
                                ${inputAssistMode === 'manual'
                                    ? 'bg-green-600 text-white ring-2 ring-green-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }
                            `}
                        >
                            C. 全て手動入力
                        </button>
                    </div>

                    {/* コンテンツ表示 */}
                    {inputAssistMode === 'draw' && (
                        <div className="pt-4 border-t border-gray-200">
                            <BlockGridEditor
                                blockGrid={blockGrid}
                                setBlockGrid={setBlockGrid}
                                onApplyToConfig={onApplyBlockGrid}
                                isGridApplied={isGridApplied}
                                onResetGrid={onResetGrid}
                            />
                        </div>
                    )}

                    {inputAssistMode === 'image' && (
                        <div className="pt-4 border-t border-gray-200">
                            <AIPdfExtractor
                                isAnalyzing={isAnalyzing}
                                analysisError={analysisError}
                                analysisSuccess={analysisSuccess}
                                onAnalyze={onAnalyzeFile}
                            />
                        </div>
                    )}

                    {inputAssistMode === 'manual' && (
                        <div className="pt-4 border-t border-gray-200 bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-700">
                                <strong className="text-green-700">✓ 手動入力モード</strong><br />
                                下記の「大枠の設定」「個別部材の設定」から直接入力を開始してください。
                            </p>
                        </div>
                    )}

                    {inputAssistMode === null && (
                        <div className="pt-4 border-t border-gray-200 bg-gray-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-gray-600">
                                上記のボタンから入力方法を選択してください
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* 中段１：入力フォームの解説｜大枠の設定（2列並列） */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="📖 使い方" defaultOpen>
                    <div className="p-4 space-y-4 text-sm text-gray-700">
                        <div>
                            <p><strong className="text-green-700">■ 入力補助（任意）</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li><strong>A.絵を描く：</strong>マス目をクリックして直感的に形を作成</li>
                                <li><strong>B.画像読込：</strong>PDFや図面画像をAI解析</li>
                            </ul>
                        </div>

                        <div>
                            <p><strong className="text-green-700">■ 入力の流れ</strong></p>
                            <ol className="list-decimal list-inside space-y-1 ml-2">
                                <li>（任意）入力補助を利用して大枠の設定</li>
                                <li>手動で大枠の設定（スパン・枠幅・段数・高さ）</li>
                                <li>手動で個別部材の設定（ジャッキ・アンチ・巾木等）</li>
                                <li>「📊拾い出し結果」タブで数量・重量を確認</li>
                            </ol>
                        </div>

                        {/* 立面図と平面図の画像 */}
                        <div className="pt-3 border-t border-gray-200">
                            <p><strong className="text-green-700">■ 入力フォームの見方</strong></p>
                            {/* 立面図と平面図 */}
                            <div className="flex justify-center items-center gap-6 p-4 h-full">
                                <div className="flex-1 flex justify-center">
                                <img
                                    src="/assets/立面図.jpg"
                                    alt="立面図"
                                    className="h-auto max-h-64 w-auto object-contain"
                                />
                                </div>
                                <div className="flex-1 flex justify-center">
                                <img
                                    src="/assets/平面図.jpg"
                                    alt="平面図"
                                    className="h-auto max-h-64 w-auto object-contain"
                                />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                <fieldset disabled={isAnalyzing || (blockGrid !== null && !isGridApplied)} className="disabled:opacity-60 transition-opacity">
                    <Card title="大枠の設定" defaultOpen>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                        {/* 1列目：スパン方向 */}
                        <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-100">
                            <h4 className="font-semibold text-green-800">◎ スパン方向（長手）</h4>
                            <InputGroup label="600mmスパン数" type="number" value={config.span600} onChange={e => setConfigField('span600', parseInt(e.target.value) || 0)} min={0} />
                            <InputGroup label="900mmスパン数" type="number" value={config.span900} onChange={e => setConfigField('span900', parseInt(e.target.value) || 0)} min={0} />
                            <InputGroup label="1200mmスパン数" type="number" value={config.span1200} onChange={e => setConfigField('span1200', parseInt(e.target.value) || 0)} min={0} />
                            <InputGroup label="1500mmスパン数" type="number" value={config.span1500} onChange={e => setConfigField('span1500', parseInt(e.target.value) || 0)} min={0} />
                            <InputGroup label="1800mmスパン数" type="number" value={config.span1800} onChange={e => setConfigField('span1800', parseInt(e.target.value) || 0)} min={0} />
                        </div>

                        {/* 2列目：枠方向 + 高さ方向 */}
                        <div className="space-y-6">
                            {/* 高さ方向 */}
                            <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-100">
                                <h4 className="font-semibold text-green-800">◎ 高さ方向</h4>
                                <InputGroup label="段数" type="number" value={config.levelCount} onChange={e => setConfigField('levelCount', parseInt(e.target.value) || 1)} min={1} />
                                <InputGroup label="各段の高さ" as="select" value={config.heightMode} onChange={e => setConfigField('heightMode', e.target.value as 'all1700' | 'custom')}>
                                    <option value="all1700">全段1700mm</option>
                                    <option value="custom">一部を指定する</option>
                                </InputGroup>
                                {config.heightMode === 'custom' && (
                                    <div className="space-y-2 pt-2 border-t border-green-200 mt-2">
                                        {config.customHeights.map((row, index) => (
                                            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                                <InputGroup label={`高さ`} hideLabel as="select" value={row.height} onChange={e => handleCustomHeightChange(index, 'height', parseInt(e.target.value))}>
                                                    <option value={1700}>1700</option>
                                                    <option value={1200}>1200</option>
                                                    <option value={900}>900</option>
                                                    <option value={600}>600</option>
                                                    <option value={400}>400</option>
                                                </InputGroup>
                                                <InputGroup label={`段数`} hideLabel type="number" value={row.count} min={1} onChange={e => handleCustomHeightChange(index, 'count', parseInt(e.target.value) || 1)} />
                                                {config.customHeights.length > 1 && <button onClick={() => removeCustomHeightRow(index)} className="text-red-500 hover:text-red-700 font-bold">✖️</button>}
                                            </div>
                                        ))}
                                        <button onClick={addCustomHeightRow} className="text-sm text-green-700 hover:text-green-800 font-semibold mt-2">+ 行を追加</button>
                                        {validation.customHeightStatus === 'under' && <Alert type="warning" message={`現在 ${config.levelCount - validation.remainingLevels} 段 指定済（残り ${validation.remainingLevels} 段）`} />}
                                        {validation.customHeightStatus === 'over' && <Alert type="error" message={`段数が超過しています！`} />}
                                        {validation.customHeightStatus === 'ok' && <Alert type="success" message="指定段数が一致しました" />}
                                    </div>
                                )}
                                <div className="pt-2 text-sm font-medium text-gray-600">
                                    <div>足場の総高さ: H {totalHeight} mm</div>
                                    <div>（ジャッキ含まず）</div>
                                </div>
                            </div>
                            {/* 枠方向・階段設置 */}
                            <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-100">
                                <h4 className="font-semibold text-green-800">◎ 枠方向</h4>
                                <InputGroup
                                    label="枠幅"
                                    as="select"
                                    value={config.frameWidth}
                                    onChange={e => setConfigField('frameWidth', parseInt(e.target.value) as 450 | 600 | 900 | 1200)}
                                >
                                    <option value={450}>450mm</option>
                                    <option value={600}>600mm</option>
                                    <option value={900}>900mm</option>
                                    <option value={1200}>1200mm</option>
                                </InputGroup>

                                {/* 階段設置 */}
                                <div className="mt-4">
                                    <h4 className="font-semibold text-green-800">◎ 階段設置</h4>
                                    <InputGroup label="" as="select" value={config.stairMode} onChange={e => setConfigField('stairMode', e.target.value as 'none' | 'notTop' | 'custom')}>
                                        <option value="none">設置しない</option>
                                        <option value="notTop">設置する（最上段以外）</option>
                                        <option value="custom">設置する（指定段のみ）</option>
                                    </InputGroup>
                                    {config.stairMode === 'custom' && (
                                        <div className="ml-4 mt-2">
                                            <InputGroup label="段番号 (カンマ区切り)" placeholder="例: 1,2,4" value={config.stairLevels} onChange={e => setConfigField('stairLevels', e.target.value)} />
                                        </div>
                                    )}
                                    {config.stairMode !== 'none' && config.stairSpanCount > 0 && (
                                        <div className="ml-4 mt-2">
                                            <InputGroup label="階段箇所数" type="number" value={config.stairSpanCount} onChange={e => setConfigField('stairSpanCount', parseInt(e.target.value) || 1)} min={1} />
                                        </div>
                                    )}
                                    {/* 枠幅が450/600/900の時に階段ありの場合、拡幅選択を表示 */}
                                    {config.stairMode !== 'none' && config.stairSpanCount > 0 && config.frameWidth !== 1200 && (
                                        <div className="ml-4 mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={config.stairFrameWidening}
                                                    onChange={e => setConfigField('stairFrameWidening', e.target.checked)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm text-gray-700">階段部4列を1200枠に拡幅する</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    </Card>
                </fieldset>
            </div>

            {/* 中段２：個別部材の設定（1列） */}
            <fieldset disabled={isAnalyzing || (blockGrid !== null && !isGridApplied)} className="disabled:opacity-60 transition-opacity">
                <Card title="個別部材の設定" defaultOpen>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                        {/* Jack Base + Anti + Toeboard */}
                        <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-100">
                            {/* ジャッキベース */}
                            <h4 className="font-semibold text-green-800">◎ ジャッキベース</h4>
                            <InputGroup label="" as="select" value={config.jackBaseMode} onChange={e => setConfigField('jackBaseMode', e.target.value as 'none' | 'jackBaseOnly' | 'jackBaseWithTaiko')}>
                                <option value="none">不要</option>
                                <option value="jackBaseOnly">必要（ジャッキベースのみ）</option>
                                <option value="jackBaseWithTaiko">必要（ジャッキベース＋タイコ）</option>
                            </InputGroup>
                            {config.jackBaseMode !== 'none' && (
                                <>
                                    <InputGroup label="ジャッキベースの種類" as="select" value={config.jackBaseOption} onChange={e => setConfigField('jackBaseOption', e.target.value as 'allSB20' | 'allSB40' | 'custom')}>
                                        <option value="allSB20">全てSB20（H58-H230）</option>
                                        <option value="allSB40">全てSB40（H58-H350）</option>
                                        <option value="custom">個別指定</option>
                                    </InputGroup>
                                    {config.jackBaseOption === 'custom' && (
                                        <div className="space-y-2">
                                            <InputGroup label="SB20の本数" type="number" min={0} value={config.sb20Count} onChange={e => setConfigField('sb20Count', parseInt(e.target.value) || 0)} />
                                            <InputGroup label="SB40の本数" type="number" min={0} value={config.sb40Count} onChange={e => setConfigField('sb40Count', parseInt(e.target.value) || 0)} />
                                            {validation.jackBaseStatus === 'under' && <Alert type="warning" message={`支柱の箇所数に対して不足しています (必要: ${validation.jackBaseNeeded} / 指定: ${validation.jackBaseProvided})`} />}
                                            {validation.jackBaseStatus === 'over' && <Alert type="error" message={`支柱の箇所数に対して超過しています (必要: ${validation.jackBaseNeeded} / 指定: ${validation.jackBaseProvided})`} />}
                                            {validation.jackBaseStatus === 'ok' && <Alert type="success" message="支柱の箇所数とジャッキの本数が一致しています" />}
                                        </div>
                                    )}
                                    {config.jackBaseMode === 'jackBaseWithTaiko' && (
                                        <div className="space-y-2">
                                            <InputGroup label="タイコ40" type="number" min={0} value={config.taiko40} onChange={e => setConfigField('taiko40', parseInt(e.target.value) || 0)} />
                                            <InputGroup label="タイコ80" type="number" min={0} value={config.taiko80} onChange={e => setConfigField('taiko80', parseInt(e.target.value) || 0)} />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* アンチ設置段 */}
                            <h4 className="font-semibold text-green-800 mt-6">◎ アンチ設置段（各段の下部に設置とする）</h4>
                            <InputGroup label="" as="select" value={config.antiMode} onChange={e => setConfigField('antiMode', e.target.value as 'all' | 'notBottom' | 'custom')}>
                                <option value="all">全段（既存足場の上に更に組む場合）</option>
                                <option value="notBottom">最下段以外（GLから組み始める場合）</option>
                                <option value="custom">指定段</option>
                            </InputGroup>
                            {config.antiMode === 'custom' && (
                                <div className="ml-4">
                                    <InputGroup label="段番号 (カンマ区切り)" placeholder="例: 1,3,5" value={config.antiLevels} onChange={e => setConfigField('antiLevels', e.target.value)} />
                                </div>
                            )}

                            {/* 足元選択 */}
                            <h4 className="font-semibold text-green-800 mt-6">◎ 各段の足元構成</h4>
                            <InputGroup label="" as="select" value={config.footingType} onChange={e => setConfigField('footingType', e.target.value as 'oneSideToeboardOneSideHandrail' | 'bothSideToeboard' | 'bothSideToeboardAndHandrail' | 'bothSideHandrail')}>
                                <option value="oneSideToeboardOneSideHandrail">片面巾木＋片面下桟</option>
                                <option value="bothSideToeboard">両面巾木</option>
                                <option value="bothSideToeboardAndHandrail">両面巾木＋両面下桟</option>
                                <option value="bothSideHandrail">両面下桟</option>
                            </InputGroup>

                            {/* 巾木設置段（両面下桟の場合は非表示） */}
                            {config.footingType !== 'bothSideHandrail' && (
                                <>
                                    <h4 className="font-semibold text-green-800 mt-6">◎ 巾木設置段（各段の下部に設置とする）</h4>
                                    <InputGroup label="" as="select" value={config.toeboardMode} onChange={e => setConfigField('toeboardMode', e.target.value as 'all' | 'sameAsAnti' | 'custom')}>
                                        <option value="all">全段</option>
                                        <option value="sameAsAnti">アンチと同じ段</option>
                                        <option value="custom">指定段</option>
                                    </InputGroup>
                                    {config.toeboardMode === 'custom' && (
                                        <div className="ml-4">
                                            <InputGroup label="段番号 (カンマ区切り)" placeholder="例: 1,3,5" value={config.toeboardLevels} onChange={e => setConfigField('toeboardLevels', e.target.value)} />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Tsuma + Stair + Perimeter Sheet */}
                        <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-100">
                            {/* 妻側手すり */}
                            <h4 className="font-semibold text-green-800">◎ 妻側手すり</h4>
                            <InputGroup label="" as="select" value={config.tsumaCount} onChange={e => setConfigField('tsumaCount', parseInt(e.target.value) as 0|1|2)}>
                                <option value={2}>両妻必要</option>
                                <option value={1}>片妻のみ</option>
                                <option value={0}>不要</option>
                            </InputGroup>

                            {/* 妻側シート */}
                            <h4 className="font-semibold text-green-800 mt-6">◎ 妻側シート</h4>
                            <InputGroup label="" as="select" value={config.tsumaSheetCount} onChange={e => setConfigField('tsumaSheetCount', parseInt(e.target.value) as 0|1|2)}>
                                <option value={2}>両妻必要</option>
                                <option value={1}>片妻のみ</option>
                                <option value={0}>不要</option>
                            </InputGroup>
                            {config.tsumaSheetCount > 0 && (
                                <div className="ml-4 space-y-2">
                                    <InputGroup label="必要段数（3段/1枚として計算します）" as="select" value={config.tsumaSheetLevelMode} onChange={e => setConfigField('tsumaSheetLevelMode', e.target.value as 'all' | 'custom')}>
                                        <option value="all">全段</option>
                                        <option value="custom">段数指定</option>
                                    </InputGroup>
                                    {config.tsumaSheetLevelMode === 'custom' && (
                                        <div className="ml-4">
                                            <InputGroup label="段数" type="number" placeholder="指定する段数を入力" value={config.tsumaSheetLevelCount} min={0} onChange={e => setConfigField('tsumaSheetLevelCount', parseInt(e.target.value) || 0)} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 外周シート */}
                            <h4 className="font-semibold text-green-800 mt-6">◎ 外周シート</h4>
                            <InputGroup label="" as="select" value={config.perimeterSheetMode} onChange={e => setConfigField('perimeterSheetMode', e.target.value as 'none' | 'required')}>
                                <option value="none">不要</option>
                                <option value="required">必要</option>
                            </InputGroup>
                            {config.perimeterSheetMode === 'required' && (
                                <div className="ml-4 space-y-2">
                                    <InputGroup label="必要段数（3段/1枚として計算します）" as="select" value={config.perimeterSheetLevelMode} onChange={e => setConfigField('perimeterSheetLevelMode', e.target.value as 'all' | 'custom')}>
                                        <option value="all">全段</option>
                                        <option value="custom">段数指定</option>
                                    </InputGroup>
                                    {config.perimeterSheetLevelMode === 'custom' && (
                                        <div className="ml-4">
                                            <InputGroup label="段数" type="number" placeholder="指定する段数を入力" value={config.perimeterSheetLevelCount} min={0} onChange={e => setConfigField('perimeterSheetLevelCount', parseInt(e.target.value) || 0)} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Wall Tie + Layer Net */}
                        <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-100">
                            {/* 壁つなぎ */}
                            <h4 className="font-semibold text-green-800">◎ 壁つなぎ</h4>
                            <InputGroup label="" as="select" value={config.wallTieMode} onChange={e => setConfigField('wallTieMode', e.target.value as 'none' | 'KTS16' | 'KTS20' | 'KTS30' | 'KTS45' | 'KTS60' | 'KTS80' | 'KTS100')}>
                                <option value="none">不要</option>
                                <option value="KTS16">KTS16（160-200）</option>
                                <option value="KTS20">KTS20（200-240）</option>
                                <option value="KTS30">KTS30（240-320）</option>
                                <option value="KTS45">KTS45（320-480）</option>
                                <option value="KTS60">KTS60（480-670）</option>
                                <option value="KTS80">KTS80（670-860）</option>
                                <option value="KTS100">KTS100（860-1050）</option>
                            </InputGroup>
                            {config.wallTieMode !== 'none' && (
                                <div className="ml-4 space-y-2">
                                    <InputGroup label="設置段数" as="select" value={config.wallTieLevelMode} onChange={e => setConfigField('wallTieLevelMode', e.target.value as 'all' | 'alternate' | 'custom')}>
                                        <option value="all">全段</option>
                                        <option value="alternate">隔段</option>
                                        <option value="custom">設置段数を手入力</option>
                                    </InputGroup>
                                    {config.wallTieLevelMode === 'custom' && (
                                        <div className="ml-4">
                                            <InputGroup label="段数" type="number" placeholder="全5段中3段だけ設置→3" value={config.wallTieLevelCount} min={0} onChange={e => setConfigField('wallTieLevelCount', parseInt(e.target.value) || 0)} />
                                        </div>
                                    )}
                                    
                                    <InputGroup label="1段当たりの設置数" as="select" value={config.wallTieSpanMode} onChange={e => setConfigField('wallTieSpanMode', e.target.value as 'all' | 'alternate' | 'custom')}>
                                        <option value="all">全スパン</option>
                                        <option value="alternate">隔スパン</option>
                                        <option value="custom">1段当たりの設置数を手入力</option>
                                    </InputGroup>
                                    {config.wallTieSpanMode === 'custom' && (
                                        <div className="ml-4">
                                            <InputGroup label="1段当たりの設置数" type="number" placeholder="各段20個ずつ→20" value={config.wallTieSpanCount} min={0} onChange={e => setConfigField('wallTieSpanCount', parseInt(e.target.value) || 0)} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 層間養生ネット */}
                            <h4 className="font-semibold text-green-800 mt-6">◎ 層間養生ネット</h4>
                            <InputGroup label="" as="select" value={config.layerNetMode} onChange={e => setConfigField('layerNetMode', e.target.value as 'none' | 'required')}>
                                <option value="none">不要</option>
                                <option value="required">必要</option>
                            </InputGroup>
                            {config.layerNetMode === 'required' && (
                                <div className="ml-4 space-y-2">
                                    <InputGroup label="設置段数" as="select" value={config.layerNetLevelMode} onChange={e => setConfigField('layerNetLevelMode', e.target.value as 'all' | 'alternate' | 'custom')}>
                                        <option value="all">全段</option>
                                        <option value="alternate">隔段</option>
                                        <option value="custom">設置段数を手入力</option>
                                    </InputGroup>
                                    {config.layerNetLevelMode === 'custom' && (
                                        <div className="ml-4">
                                            <InputGroup label="段数" type="number" placeholder="全5段中3段だけ設置→3" value={config.layerNetLevelCount} min={0} onChange={e => setConfigField('layerNetLevelCount', parseInt(e.target.value) || 0)} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Card title="📝 フリーメモ" defaultOpen>
                    <div className="p-4">
                        <textarea
                            className="w-full p-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-150 ease-in-out"
                            rows={4}
                            placeholder="現場名、日付、担当者、部位など自由記入"
                            value={config.memo}
                            onChange={e => setConfigField('memo', e.target.value)}
                        />
                    </div>
                </Card>
            </fieldset>
        </div>
    );
};