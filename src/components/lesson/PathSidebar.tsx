'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2,
  BookOpen, PanelLeftClose, PanelLeftOpen, Menu, X,
} from 'lucide-react'

interface LessonNav {
  id: string
  title: string
  difficulty: string
  order_index: number
  content_status: string
  progress_status: string // 'completed' | 'in_progress' | 'not_started'
}

interface CourseNav {
  id: string
  title: string
  order_index: number
  status: string
  lessons: LessonNav[]
}

interface PathSidebarProps {
  pathTitle: string
  courses: CourseNav[]
  activeLessonId: string
  activeCourseId: string
}

const DIFFICULTY_COLOR: Record<string, string> = {
  intro:    'text-emerald-500',
  easy:     'text-sky-500',
  medium:   'text-amber-500',
  hard:     'text-orange-500',
  capstone: 'text-purple-500',
}

export default function PathSidebar({ pathTitle, courses, activeLessonId, activeCourseId }: PathSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(
    () => new Set([activeCourseId])
  )

  function toggleCourse(courseId: string) {
    setExpandedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  const sidebarBody = (
    <SidebarContent
      pathTitle={pathTitle}
      courses={courses}
      activeLessonId={activeLessonId}
      activeCourseId={activeCourseId}
      expandedCourses={expandedCourses}
      toggleCourse={toggleCourse}
      onCloseMobile={() => setMobileOpen(false)}
    />
  )

  return (
    <>
      {/* Mobile floating menu trigger — only visible <lg */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open path navigation"
        className="lg:hidden fixed left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close path navigation"
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarBody}
          </div>
        </div>
      )}

      {/* Desktop sidebar — unchanged behavior */}
      {collapsed ? (
        <div className="hidden lg:flex h-full w-12 flex-col items-center border-r border-border bg-card py-3 gap-4 flex-shrink-0">
          <button
            onClick={() => setCollapsed(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : (
        <div className="hidden lg:flex h-full w-64 flex-shrink-0 flex-col border-r border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-3 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-xs font-semibold truncate text-foreground">{pathTitle}</span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 ml-1"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            <CourseList
              courses={courses}
              activeLessonId={activeLessonId}
              activeCourseId={activeCourseId}
              expandedCourses={expandedCourses}
              toggleCourse={toggleCourse}
            />
          </div>
        </div>
      )}
    </>
  )
}

function SidebarContent({
  pathTitle, courses, activeLessonId, activeCourseId,
  expandedCourses, toggleCourse, onCloseMobile,
}: {
  pathTitle: string
  courses: CourseNav[]
  activeLessonId: string
  activeCourseId: string
  expandedCourses: Set<string>
  toggleCourse: (id: string) => void
  onCloseMobile?: () => void
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border flex-shrink-0">
        <BookOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-semibold truncate text-foreground pr-7">{pathTitle}</span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        <CourseList
          courses={courses}
          activeLessonId={activeLessonId}
          activeCourseId={activeCourseId}
          expandedCourses={expandedCourses}
          toggleCourse={toggleCourse}
          onLessonClick={onCloseMobile}
        />
      </div>
    </>
  )
}

function CourseList({
  courses, activeLessonId, activeCourseId,
  expandedCourses, toggleCourse, onLessonClick,
}: {
  courses: CourseNav[]
  activeLessonId: string
  activeCourseId: string
  expandedCourses: Set<string>
  toggleCourse: (id: string) => void
  onLessonClick?: () => void
}) {
  return (
    <>
      {courses.map((course) => {
        const isExpanded = expandedCourses.has(course.id)
        const isActiveCourse = course.id === activeCourseId
        const completedCount = course.lessons.filter((l) => l.progress_status === 'completed').length
        const isPending = course.status !== 'generated'

        return (
          <div key={course.id}>
            <button
              onClick={() => toggleCourse(course.id)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent ${
                isActiveCourse ? 'bg-accent/60' : ''
              }`}
            >
              <span className="text-muted-foreground flex-shrink-0">
                {isExpanded
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                    {course.order_index + 1}
                  </span>
                  {isPending && <Loader2 className="h-2.5 w-2.5 text-blue-400 animate-spin" />}
                </div>
                <p className="text-xs font-medium truncate leading-tight">{course.title}</p>
                {!isPending && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {completedCount}/{course.lessons.length} done
                  </p>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="pb-1">
                {course.lessons.map((lesson) => {
                  const isActive = lesson.id === activeLessonId
                  const isPendingLesson = lesson.content_status !== 'generated'

                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/${course.id}/${lesson.id}`}
                      onClick={onLessonClick}
                      className={`flex items-center gap-2.5 pl-8 pr-3 py-1.5 transition-colors ${
                        isActive
                          ? 'bg-primary/10 border-r-2 border-primary text-foreground'
                          : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="flex-shrink-0">
                        {lesson.progress_status === 'completed' ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        ) : isPendingLesson ? (
                          <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
                        ) : (
                          <Circle className={`h-3 w-3 ${isActive ? 'text-primary' : 'text-border'}`} />
                        )}
                      </span>

                      <span className={`flex-1 truncate text-[0.72rem] leading-snug ${isActive ? 'font-medium text-foreground' : ''}`}>
                        {lesson.title}
                      </span>

                      <span className={`flex-shrink-0 text-[9px] font-semibold uppercase ${DIFFICULTY_COLOR[lesson.difficulty] ?? ''}`}>
                        {lesson.difficulty.slice(0, 3)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
