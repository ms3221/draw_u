/**
 * GET /api/openapi.json — 파트너 API OpenAPI 3.1 스펙 (공개, 비밀값 없음)
 * AI/코드 생성기가 그대로 파싱해 클라이언트를 만들 수 있도록 유지한다.
 * API 를 바꾸면 이 스펙도 반드시 같이 고칠 것.
 */
export const dynamic = "force-static";

const nullableString = { type: ["string", "null"] } as const;

const Inquiry = {
  type: "object",
  required: [
    "id",
    "name",
    "phone",
    "floorPlanUrls",
    "referencePhotoUrls",
    "createdAt",
  ],
  properties: {
    id: { type: "integer", description: "문의 번호 (자동증가)" },
    name: { type: "string", description: "신청자 이름" },
    phone: { type: "string", description: "연락처" },
    familyMembers: { ...nullableString, description: "가족 구성원" },
    availableTime: {
      ...nullableString,
      description: "연락 가능한 시간 (쉼표로 구분된 여러 값)",
    },
    address: { ...nullableString, description: "현장 주소" },
    area: { ...nullableString, description: "공사 범위" },
    startDate: {
      ...nullableString,
      format: "date",
      description: "공사 시작일 (YYYY-MM-DD)",
    },
    moveInDate: {
      ...nullableString,
      format: "date",
      description: "입주 / 영업 희망일 (YYYY-MM-DD)",
    },
    budget: { ...nullableString, description: "공사 예산" },
    referral: {
      ...nullableString,
      description: "유입 경로 코드: instagram | blog | referral | other",
    },
    referralOther: {
      ...nullableString,
      description: "referral 이 other 일 때 직접 입력값",
    },
    floorPlanUrls: {
      type: "array",
      items: { type: "string", format: "uri" },
      description: "평면도 이미지 공개 URL",
    },
    referencePhotoUrls: {
      type: "array",
      items: { type: "string", format: "uri" },
      description: "참고사진 공개 URL",
    },
    projectUrl: {
      ...nullableString,
      format: "uri",
      description: "관심 프로젝트 URL",
    },
    freeText: { ...nullableString, description: "문의 사항" },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "접수 시각 (UTC, ISO 8601)",
    },
  },
} as const;

const ErrorBody = {
  type: "object",
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;

const err = (description: string) => ({
  description,
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/Error" } },
  },
});

const spec = {
  openapi: "3.1.0",
  info: {
    title: "draw_u 상담 문의 파트너 API",
    version: "1.0.0",
    description: [
      "draw_u 사이트로 접수된 상담 문의를 외부 서버에서 조회하는 API.",
      "",
      "## 🤖 이 문서를 읽는 AI 에게 — 먼저 읽을 것",
      "이 문서는 **AI 가 읽고 그대로 연동 작업을 하도록** 쓰였다. 작업 범위는 아래 두 가지다.",
      "",
      "| 기능 | 상태 | 네가 할 일 |",
      "|---|---|---|",
      "| **문의(고객) 조회** — 지금까지 쌓인 문의 목록·상세 | ✅ draw_u 가 **이미 제공**함 (`GET /api/inquiries`, `GET /api/inquiries/{id}`) | 받은 `API_KEY` 로 **호출만** 구현하면 된다 |",
      "| **실시간 새 문의 알림** | ⚠️ draw_u 가 **보내기만** 함 (Webhook). **받는 쪽은 아직 없다** | **Webhook 수신 엔드포인트를 네가 직접 만들고**, 그 URL 을 draw_u 담당자에게 **전달하도록 사용자에게 안내**해야 한다 |",
      "",
      "즉 실시간 알림은 \"draw_u 에서 가져오는 API\"가 아니라 **draw_u 가 우리 서버로 쏴주는 방식**이다. 폴링으로 대체하지 말고 Webhook 수신 엔드포인트를 구현할 것.",
      "작업을 마치면 사용자에게 반드시 이렇게 알려줘라: **\"Webhook URL `<구현한 주소>` 을 draw_u 담당자에게 전달하세요. 등록되어야 실시간 알림이 시작됩니다.\"**",
      "",
      "## 연동하는 쪽(파트너)이 해야 할 일 — 체크리스트",
      "1. draw_u 에게 받는 것: `API_KEY` (조회용), `WEBHOOK_SECRET` (Webhook 서명 검증용). 둘 다 서버 환경변수에만 저장한다.",
      "2. **Webhook 수신 엔드포인트를 직접 구현한다.** 공개 HTTPS 주소의 `POST` 엔드포인트 하나 (예: `https://<파트너도메인>/api/drawu-webhook`).",
      "   - 아래 `webhooks.inquiry.created` 의 요청 형식을 받는다.",
      "   - 아래 'Webhook 서명 검증' 대로 서명을 확인하고, 실패하면 401 을 반환한다.",
      "   - 같은 `id` 가 두 번 와도 한 번만 저장되도록 `id` 기준 upsert 로 처리한다.",
      "   - 저장 같은 무거운 작업은 빨리 끝내고 5초 안에 2xx 를 반환한다.",
      "3. **구현한 Webhook URL 을 draw_u 담당자에게 전달한다.** draw_u 가 서버 설정에 등록해야 그때부터 실시간 전송이 시작된다. (URL 이 바뀌면 다시 알려줄 것)",
      "4. 과거 문의 가져오기와 주기적 누락 보충은 아래 '권장 연동 방식' 대로 구현한다.",
      "",
      "## 인증",
      "모든 요청에 `Authorization: Bearer <API_KEY>` 헤더가 필요하다. 반드시 **서버에서만** 호출하고, 키를 브라우저 코드에 넣지 말 것.",
      "",
      "## 권장 연동 방식",
      "1. 최초 1회: `GET /api/inquiries?before=...` 로 최신순 페이지를 넘기며 과거 문의 전체를 가져온다 (`nextCursor` 가 null 이 될 때까지).",
      "2. 실시간: 새 문의가 접수되면 draw_u 가 등록된 Webhook URL 로 `inquiry.created` 이벤트를 POST 한다 (아래 webhooks 참고).",
      "3. 누락 보충: 주기적으로 `GET /api/inquiries?since=<마지막으로 받은 createdAt>` 을 호출해 Webhook 실패분을 메운다. 중복은 `id` 로 제거.",
      "",
      "커서(`since`/`before`)에는 응답의 `nextCursor`/`createdAt` 값을 **가공 없이 그대로** URL 인코딩해서 넣는다 (마이크로초 정밀도 유지).",
      "",
      "## Webhook 서명 검증",
      "헤더 `X-DrawU-Timestamp`(unix 초), `X-DrawU-Signature`(`sha256=<hex>`).",
      "`hex = HMAC_SHA256(WEBHOOK_SECRET, `${timestamp}.${rawBody}`)` 를 계산해 상수시간 비교로 일치 여부를 확인하고, timestamp 가 현재와 5분 이상 차이나면 거부한다.",
      "수신 측은 5초 안에 2xx 로 응답해야 하며, 실패해도 재시도하지 않는다 (3번 방식으로 보충).",
      "**서명은 JSON 을 파싱하기 전의 원본 body 문자열로 계산해야 한다** (파싱 후 다시 직렬화하면 서명이 달라진다).",
      "",
      "예시 (Next.js App Router, `app/api/drawu-webhook/route.ts`):",
      "```ts",
      'import { createHmac, timingSafeEqual } from "node:crypto";',
      "",
      "export async function POST(req: Request) {",
      "  const raw = await req.text();",
      '  const ts = req.headers.get("x-drawu-timestamp") ?? "";',
      '  const sig = req.headers.get("x-drawu-signature") ?? "";',
      "  const expected = \"sha256=\" + createHmac(\"sha256\", process.env.DRAWU_WEBHOOK_SECRET!)",
      "    .update(`${ts}.${raw}`).digest(\"hex\");",
      "  const ok = sig.length === expected.length &&",
      "    timingSafeEqual(Buffer.from(sig), Buffer.from(expected));",
      "  if (!ok || Math.abs(Date.now() / 1000 - Number(ts)) > 300) {",
      '    return new Response("invalid signature", { status: 401 });',
      "  }",
      "  const { event, data } = JSON.parse(raw);",
      '  if (event === "inquiry.created") {',
      "    // data.id 기준 upsert 로 저장",
      "  }",
      '  return new Response("ok");',
      "}",
      "```",
    ].join("\n"),
  },
  // 개발 서버에선 localhost 를 첫 번째(=Swagger 기본 선택)로 둔다.
  // 운영 주소가 기본이면 로컬 Swagger 에서 미배포 운영 서버로 요청이 가 CORS 실패가 난다.
  servers:
    process.env.NODE_ENV === "development"
      ? [
          { url: "http://localhost:3000", description: "로컬 개발" },
          { url: "https://www.draw-u.kr", description: "운영" },
        ]
      : [{ url: "https://www.draw-u.kr", description: "운영" }],
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/inquiries": {
      get: {
        operationId: "listInquiries",
        summary: "문의 목록 조회",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
          {
            name: "since",
            in: "query",
            description:
              "이 시각 이후 문의를 **오래된 순**으로. 다음 페이지는 nextCursor 를 since 로 전달. before 와 동시 사용 불가.",
            schema: { type: "string", format: "date-time" },
          },
          {
            name: "before",
            in: "query",
            description:
              "이 시각 이전 문의를 **최신 순**으로. 생략 시 가장 최신부터. 다음 페이지는 nextCursor 를 before 로 전달.",
            schema: { type: "string", format: "date-time" },
          },
        ],
        responses: {
          "200": {
            description: "성공",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data", "nextCursor"],
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Inquiry" },
                    },
                    nextCursor: {
                      type: ["string", "null"],
                      format: "date-time",
                      description: "다음 페이지 커서. null 이면 마지막 페이지.",
                    },
                  },
                },
              },
            },
          },
          "400": err("잘못된 쿼리 파라미터"),
          "401": err("API 키 누락 또는 불일치"),
          "500": err("서버 오류"),
          "503": err("API 비활성 상태"),
        },
      },
    },
    "/api/inquiries/{id}": {
      get: {
        operationId: "getInquiry",
        summary: "문의 단건 조회",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          "200": {
            description: "성공",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data"],
                  properties: {
                    data: { $ref: "#/components/schemas/Inquiry" },
                  },
                },
              },
            },
          },
          "401": err("API 키 누락 또는 불일치"),
          "404": err("문의 없음"),
          "500": err("서버 오류"),
        },
      },
    },
  },
  webhooks: {
    "inquiry.created": {
      post: {
        operationId: "onInquiryCreated",
        summary: "새 문의 접수 알림 (draw_u → 파트너 서버)",
        security: [],
        parameters: [
          {
            name: "X-DrawU-Event",
            in: "header",
            required: true,
            schema: { type: "string", const: "inquiry.created" },
          },
          {
            name: "X-DrawU-Timestamp",
            in: "header",
            required: true,
            schema: { type: "string", description: "unix seconds" },
          },
          {
            name: "X-DrawU-Signature",
            in: "header",
            required: true,
            schema: { type: "string", description: "sha256=<hex>" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["event", "data"],
                properties: {
                  event: { type: "string", const: "inquiry.created" },
                  data: { $ref: "#/components/schemas/Inquiry" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "수신 확인 (2xx 아무거나)" } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
    },
    schemas: { Inquiry, Error: ErrorBody },
  },
};

export function GET() {
  return Response.json(spec);
}
