import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DayPlannerComponent } from './components/day-planner/day-planner.component';
import { StudyHubDashboardComponent } from './components/study-hub/dashboard/dashboard.component';
import { StudyPackFormComponent } from './components/study-hub/study-pack/form/study-pack-form.component';
import { StudyPackDetailComponent } from './components/study-hub/study-pack/detail/study-pack-detail.component';
import { FlashcardsStudyModeComponent } from './components/study-hub/flashcards/study-mode/flashcards-study-mode.component';
import { QcmQuizModeComponent } from './components/study-hub/qcm/quiz-mode/qcm-quiz-mode.component';
import { StudyPackShareComponent } from './components/study-hub/study-pack/share/study-pack-share.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'planner', component: DayPlannerComponent },
  { path: 'study-hub', component: StudyHubDashboardComponent, canActivate: [authGuard] },
  { path: 'study-hub/new', component: StudyPackFormComponent, canActivate: [authGuard] },
  { path: 'study-hub/edit/:id', component: StudyPackFormComponent, canActivate: [authGuard] },
  { path: 'study-hub/share/:id', component: StudyPackShareComponent },
  { path: 'study-hub/:id', component: StudyPackDetailComponent, canActivate: [authGuard] },
  { path: 'study-hub/:packId/flashcards', component: FlashcardsStudyModeComponent, canActivate: [authGuard] },
  { path: 'study-hub/:packId/quiz', component: QcmQuizModeComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/' }
];
