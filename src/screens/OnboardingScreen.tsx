import { useState } from "react";
import { updateMe } from "../lib/api";
import type { MePatch } from "../lib/types";
import { composePreferenceText, FIELD_CHIPS, INDUSTRY_CHIPS, SIDO_LIST } from "../lib/constants";

interface Props {
  onDone: () => void;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// 온보딩 2스텝 (P2-3, §2 A7). 전 스텝 건너뛰기 가능(H9) — 건너뛴 스텝의 입력은 저장하지 않는다.
export default function OnboardingScreen({ onDone }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [fields, setFields] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [sido, setSido] = useState<string | null>(null);
  const [prefSkipped, setPrefSkipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // prefSkipped: 스텝1을 건너뛴 경우 선호 저장 제외 / skipRegion: 스텝2 건너뛰기
  async function finish(opts: { skipRegion?: boolean } = {}) {
    const preferenceText = prefSkipped ? "" : composePreferenceText(fields, industries, freeText);
    const patch: MePatch = {};
    if (preferenceText) patch.preferenceText = preferenceText;
    if (!opts.skipRegion && sido) patch.addressSido = sido;

    if (Object.keys(patch).length === 0) {
      onDone(); // 전부 건너뜀 — 저장 없이 홈 진입
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateMe(patch);
      onDone();
    } catch {
      setError("저장에 실패했어요. 네트워크 상태를 확인하고 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  if (step === 1) {
    const hasSelection = fields.length > 0 || industries.length > 0 || freeText.trim().length > 0;
    return (
      <div className="screen onboarding">
        <div className="onboarding-body">
          <p className="onboarding-step">1 / 2</p>
          <h1 className="onboarding-title">
            어떤 분야의
            <br />
            지원사업을 찾으세요?
          </h1>
          <p className="onboarding-subtitle">선택하신 분야에 맞는 지원사업을 추천해 드려요.</p>

          <p className="chip-group-label">분야</p>
          <div className="chip-grid">
            {FIELD_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`chip ${fields.includes(chip) ? "chip-selected" : ""}`}
                onClick={() => setFields((prev) => toggle(prev, chip))}
              >
                {chip}
              </button>
            ))}
          </div>

          <p className="chip-group-label">업종</p>
          <div className="chip-grid">
            {INDUSTRY_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`chip ${industries.includes(chip) ? "chip-selected" : ""}`}
                onClick={() => setIndustries((prev) => toggle(prev, chip))}
              >
                {chip}
              </button>
            ))}
          </div>

          <p className="chip-group-label">직접 입력 (선택)</p>
          <input
            className="text-input"
            type="text"
            maxLength={100}
            placeholder="예: 청년창업, 스마트공장 구축"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
          />

          {/* H16: 생성형 AI 사용 고지 — 인라인 문구(팝업 아님, H9) */}
          <p className="ai-notice">입력하신 선호는 AI가 분석해 맞춤 추천에 활용해요.</p>
        </div>

        <div className="onboarding-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setPrefSkipped(true);
              setStep(2);
            }}
          >
            건너뛰기
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!hasSelection}
            onClick={() => {
              setPrefSkipped(false);
              setStep(2);
            }}
          >
            다음
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen onboarding">
      <div className="onboarding-body">
        <p className="onboarding-step">2 / 2</p>
        <h1 className="onboarding-title">
          사업장 지역을
          <br />
          알려주세요
        </h1>
        <p className="onboarding-subtitle">
          지역을 알려주시면 우리 지역 지원사업까지 추천해 드려요.
        </p>

        <div className="sido-grid">
          {SIDO_LIST.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip ${sido === s ? "chip-selected" : ""}`}
              onClick={() => setSido((prev) => (prev === s ? null : s))}
            >
              {s}
            </button>
          ))}
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="onboarding-actions">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={saving}
          onClick={() => finish({ skipRegion: true })}
        >
          건너뛰기
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() => finish()}
        >
          {saving ? "저장 중..." : "시작하기"}
        </button>
      </div>
    </div>
  );
}
