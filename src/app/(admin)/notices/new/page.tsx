import NoticeForm from '../NoticeForm'

export default function NewNoticePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">공지 작성</h1>
        <p className="text-xs text-muted-foreground mt-0.5 tracking-tight">새 공지사항을 작성합니다</p>
      </div>
      <NoticeForm mode="create" />
    </div>
  )
}
