import { useEffect, useState } from "react";
import { deleteMyData, fetchMe, updateMe } from "../lib/api";
import type { MePatch } from "../lib/types";
import { kvRemove, openExternalURL } from "../lib/bridge";
import {
  composePreferenceText,
  FIELD_CHIPS,
  INDUSTRY_CHIPS,
  ONBOARDED_KEY,
  SIDO_LIST,
} from "../lib/constants";

const CONTACT_EMAIL = "home143@naver.com";

// 우리가 합성한 preference_text를 칩 선택으로 역파싱. 형식이 다르면(수동 편집 등) 전체를 자유입력으로
function parsePreferenceText(text: string): {
  fields: string[];
  industries: string[];
  free: string;
} {
  let rest = text.trim();
  let fields: string[] = [];
  let industries: string[] = [];

  const fm = rest.match(/^(.+?) 분야의 지원사업을 선호합니다\.\s*/);
  if (fm) {
    const tokens = fm[1].split(",").map((s) => s.trim());
    if (tokens.every((t) => (FIELD_CHIPS as readonly string[]).includes(t))) {
      fields = tokens;
      rest = rest.slice(fm[0].length);
    }
  }
  const im = rest.match(/^업종은 (.+?)입니다\.\s*/);
  if (im) {
    const tokens = im[1].split(",").map((s) => s.trim());
    if (tokens.every((t) => (INDUSTRY_CHIPS as readonly string[]).includes(t))) {
      industries = tokens;
      rest = rest.slice(im[0].length);
    }
  }
  return { fields, industries, free: rest.trim() };
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// P2-7 설정: 선호·지역 수정(온보딩 칩 UI 재사용, 현재값 프리로드), 데이터 삭제(H17), 법적 고지 링크
export default function SettingsScreen() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [fields, setFields] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [sido, setSido] = useState<string | null>(null);
  const [sigungu, setSigungu] = useState("");
  const [loaded, setLoaded] = useState<{ preferenceText: string; sido: string | null; sigungu: string }>(
    { preferenceText: "", sido: null, sigungu: "" },
  );

  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        const parsed = parsePreferenceText(me.preference_text ?? "");
        setFields(parsed.fields);
        setIndustries(parsed.industries);
        setFreeText(parsed.free);
        setSido(me.address_sido);
        setSigungu(me.address_sigungu ?? "");
        setLoaded({
          preferenceText: me.preference_text ?? "",
          sido: me.address_sido,
          sigungu: me.address_sigungu ?? "",
        });
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    const nextText = composePreferenceText(fields, industries, freeText);
    const patch: MePatch = {};
    // dirty 전송 규약: 실제 바뀐 필드만 보낸다 (서버도 preference_text 변경 여부를 재확인함)
    if (nextText !== loaded.preferenceText) patch.preferenceText = nextText;
    if (sido !== loaded.sido) patch.addressSido = sido;
    if (sigungu.trim() !== loaded.sigungu) patch.addressSigungu = sigungu.trim() || null;
    if (Object.keys(patch).length === 0) {
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
      return;
    }
    setSaving(true);
    setSaveError(false);
    try {
      const me = await updateMe(patch);
      setLoaded({
        preferenceText: me.preference_text ?? "",
        sido: me.address_sido,
        sigungu: me.address_sigungu ?? "",
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError(false);
    try {
      await deleteMyData();
    } catch {
      setDeleteError(true);
      setDeleting(false);
      return;
    }
    // 서버 삭제는 이미 성공 — 로컬 정리는 실패해도 '삭제 실패'로 표시하지 않는다 (recodex P1)
    await kvRemove(ONBOARDED_KEY);
    location.hash = "/";
    location.reload(); // 새 사용자로 재시작 (재진입 시 새 세션 발급)
  }

  if (state === "loading") {
    return (
      <div className="screen has-bottom-nav center-screen">
        <div className="spinner" aria-label="불러오는 중" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="screen has-bottom-nav center-screen">
        <p className="error-text">설정 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="screen has-bottom-nav">
      <header className="home-header">
        <h1 className="home-title">설정</h1>
      </header>

      <section className="section">
        <h2 className="section-title">선호 분야</h2>
        <p className="chip-group-label">분야</p>
        <div className="chip-grid">
          {FIELD_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`chip ${fields.includes(chip) ? "chip-selected" : ""}`}
              disabled={saving}
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
              disabled={saving}
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
          disabled={saving}
          onChange={(e) => setFreeText(e.target.value)}
        />
        {/* H16: 생성형 AI 사용 고지 */}
        <p className="ai-notice">입력하신 선호는 AI가 분석해 맞춤 추천에 활용해요.</p>
      </section>

      <section className="section">
        <h2 className="section-title">사업장 지역</h2>
        <div className="sido-grid">
          {SIDO_LIST.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip ${sido === s ? "chip-selected" : ""}`}
              disabled={saving}
              onClick={() => {
                const next = sido === s ? null : s;
                if (next !== sido) setSigungu(""); // 시/도가 바뀌면 이전 시/군/구는 무효 (recodex P1)
                setSido(next);
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="chip-group-label">시/군/구 (선택)</p>
        <input
          className="text-input"
          type="text"
          maxLength={20}
          placeholder="예: 성남시"
          value={sigungu}
          disabled={saving}
          onChange={(e) => setSigungu(e.target.value)}
        />
        <p className="section-hint">시/군/구까지 알려주시면 우리 동네 지원사업 추천이 더 정확해져요.</p>
      </section>

      <section className="section">
        {saveError && <p className="error-text">저장에 실패했어요. 잠시 후 다시 시도해 주세요.</p>}
        <button
          type="button"
          className="btn btn-primary btn-full"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "저장 중..." : "저장하기"}
        </button>
        {savedToast && <p className="saved-toast">저장했어요</p>}
      </section>

      <section className="section settings-links">
        <button
          type="button"
          className="settings-link"
          onClick={() => void openExternalURL("https://www.zisaze.com/privacy")}
        >
          개인정보처리방침
        </button>
        <button
          type="button"
          className="settings-link"
          onClick={() => void openExternalURL("https://www.zisaze.com/terms")}
        >
          이용약관
        </button>
        <p className="settings-contact">문의: {CONTACT_EMAIL}</p>
      </section>

      <section className="section">
        <button type="button" className="link-btn link-danger" onClick={() => setConfirmOpen(true)}>
          내 데이터 삭제
        </button>
      </section>

      {confirmOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <p className="modal-title">내 데이터를 삭제할까요?</p>
            <p className="modal-desc">
              선호 설정, 지역, 북마크가 모두 지워지고 되돌릴 수 없어요.
            </p>
            {deleteError && <p className="error-text">삭제에 실패했어요. 잠시 후 다시 시도해 주세요.</p>}
            <div className="modal-actions">
              {/* H15: 다이얼로그 좌측 버튼은 '닫기' */}
              <button
                type="button"
                className="btn btn-ghost"
                disabled={deleting}
                onClick={() => setConfirmOpen(false)}
              >
                닫기
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
