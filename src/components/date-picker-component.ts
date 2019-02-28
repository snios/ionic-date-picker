import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Calendar, Day } from 'dayspan';
import * as moment from 'moment';

const HTML_CODE = `
<div [ngStyle]="backgroundStyle">
    <ion-item *ngIf="showView === 'calendar'" [ngStyle]="backgroundStyle">
        <ion-icon name="calendar" item-start>
        </ion-icon>
        <button type="button" ion-button clear (click)="showMonthView()" class="calendar-button">
            {{monthLabels[monthSelected-1]}}
        </button>
        <button type="button" ion-button clear [disabled]="!hasYearSelection()" (click)="showYearView()" class="calendar-button">
            {{yearSelected}}
        </button>

        <span item-end *ngIf="hasPrevious() || hasNext()">
            <button type="button" ion-button clear [disabled]="!hasPrevious()" (click)="previous()">
                <ion-icon name="ios-arrow-back"></ion-icon>
            </button>
            <button type="button" ion-button clear [disabled]="!hasNext()" (click)="next()">
                <ion-icon name="ios-arrow-forward"></ion-icon>
            </button>
        </span>
    </ion-item>

    <ion-grid *ngIf="showView === 'calendar'">
        <ion-row>
            <ion-col *ngFor="let daylabel of dayLabels" text-center [ngStyle]="dayLabelsStyle">
                {{daylabel}}
            </ion-col>
        </ion-row>
        <ion-row *ngFor="let week of weeks">
            <ion-col *ngFor="let day of week" (click)="selectDay(day)" [ngStyle]="getDayStyle(day)" text-center>
                <span [ngStyle]="!day.inCalendar && notInCalendarStyle">{{isValidDay(day) ? day.dayOfMonth : '&nbsp;&nbsp;'}}</span>
            </ion-col>
        </ion-row>
    </ion-grid>

    <ion-grid *ngIf="showView === 'month'">
        <ion-row justify-content-end>
            <ion-col text-end>
                <button type="button" ion-button icon-only clear (click)="resetView()">
                    <ion-icon name="close"></ion-icon>
                </button>
            </ion-col>
        </ion-row>
        <ion-row>
            <ion-col *ngFor="let monthLabel of monthLabels; let i = index" [ngStyle]="getMonthStyle(i)" col-3 (click)="selectMonth(i+1)" text-center>
                <span [class.invalidMonth]="!isValidMonth(i)">{{monthLabel}}</span>
            </ion-col>
        </ion-row>
    </ion-grid>

    <ion-grid *ngIf="showView === 'year'">
        <ion-row>
            <ion-col col-10 text-center>
                    <div *ngIf="hasPreviousYears() || hasNextYears()">
                        <button type="button" ion-button icon-only clear [disabled]="!hasPreviousYears()" (click)="showPreviousYears()">
                            <ion-icon name="ios-arrow-back"></ion-icon>
                        </button>
                        <button type="button" ion-button clear [disabled]="true" class="year-range">
                            {{startYear}} to {{endYear}}
                        </button>
                    
                        <button type="button" ion-button icon-only clear [disabled]="!hasNextYears()" (click)="showNextYears()">
                            <ion-icon name="ios-arrow-forward"></ion-icon>
                        </button>
                    </div>
            </ion-col>
            <ion-col col-2 text-center>
                <button type="button" ion-button icon-only clear (click)="resetView()">
                    <ion-icon name="close"></ion-icon>
                </button>
            </ion-col>
        </ion-row> 
        <ion-row>
            <ion-col *ngFor="let year of years" [ngStyle]="getYearStyle(year)" col-3 (click)="selectYear(year)" text-center>
                {{year}}
            </ion-col>
        </ion-row>
    </ion-grid>
</div>
`;

const CSS_STYLE = `
  .item {
      .item-inner {
        border-bottom: none !important;
      }
    }

  ion-icon {
    font-size: 25px;
  }

  .year-range {
    font-size: 15px;
    font-weight: 550;
    &.button[disabled] {
      opacity: 1;
      color: gray !important;
    }
  }

  .calendar-button {
    text-decoration: underline;
    padding-right: 2px !important;
    padding-left: 2px !important;
  }

  .invalidMonth {
    color: #8b8b8b;
  }
`;

@Component({
  selector: 'ionic-calendar-date-picker',
  template: HTML_CODE,
  styles: [CSS_STYLE]
})
export class DatePickerComponent implements OnInit {

  @Input() monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  @Input() dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  @Input() date: Date;
  @Input() fromDate: Date;
  @Input() toDate: Date;

  @Input() backgroundStyle = { 'background-color': '#ffffff' };
  @Input() notInCalendarStyle = { 'color': '#8b8b8b' };
  @Input() dayLabelsStyle = { 'font-weight': 500, 'font-size': '14px' };
  @Input() monthLabelsStyle = {  'font-size': '15px' };
  @Input() yearLabelsStyle = {  'font-size': '15px' };
  @Input() itemSelectedStyle = { 'background': '#488aff', 'color': '#f4f4f4 !important' };
  @Input() todaysItemStyle = { 'color': '#32db64' };

  @Output() onSelect: EventEmitter<Date> = new EventEmitter();

  showView = 'calendar';
  weeks: Array<Array<Day>>;
  years: Array<number>;

  yearSelected = new Date().getFullYear();
  monthSelected = new Date().getMonth() + 1;

  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  currentDay = new Date().getDate();

  daySelected: Day;
  dayHighlighted: Day;

  startYear: number;
  endYear: number;

  ngOnInit() {
    this.initOptions();
    this.createCalendarWeeks();
  }

  initOptions() {

    if (this.date && this.fromDate && this.date < this.fromDate) {
      throw new Error('Invalid date input. date must be same or greater than fromDate');
    }

    if (this.date && this.toDate && this.toDate < this.date) {
      throw new Error('Invalid date input. date must be same or lesser than toDate');
    }

    if (this.toDate && this.fromDate && this.fromDate > this.toDate) {
      throw new Error('Invalid date input. from date must be lesser than or equal to toDate');
    }

    this.yearSelected = this.date ? this.date.getFullYear() : this.toDate ? this.toDate.getFullYear() : new Date().getFullYear();
    this.monthSelected = this.date ? this.date.getMonth() + 1 : this.toDate ? this.toDate.getMonth() + 1 :  new Date().getMonth() + 1;
    this.dayHighlighted = this.date ? Day.fromDate(this.date) : this.toDate ? Day.fromDate(this.toDate) :  Day.today();

    if (this.date) {
      this.daySelected = this.dayHighlighted;
    }
  }

  createCalendarWeeks() {
    this.weeks = this.generateCalendarWeeks(
      Day.fromMoment(
        moment(this.monthSelected + '-01-' + this.yearSelected, 'MM-DD-YYYY')
      )
    );
  }

  hasPrevious(): boolean {
    if (!this.fromDate) {
      return true;
    }

    let previousMonth;
    let previousYear;
    if (this.monthSelected === 1) {
      previousMonth = 11;
      previousYear = this.yearSelected - 1;
    } else {
      previousMonth = this.monthSelected;
      previousYear = this.yearSelected;
    }

    // The last day of previous month should be greatar than or equal to fromDate
    return new Date(previousYear, previousMonth, 0) >= this.fromDate;
  }

  hasNext(): boolean {
    if (!this.toDate) {
      return true;
    }

    let nextMonth;
    let nextYear;
    if (this.monthSelected === 12) {
      nextMonth = 0;
      nextYear = this.yearSelected + 1;
    } else {
      nextMonth = this.monthSelected;
      nextYear = this.yearSelected;
    }

    // The first day of next month should be less than or equal to toDate
    return new Date(nextYear, nextMonth, 1) <= this.toDate;

  }

  previous() {
    if (this.monthSelected === 1) {
      this.monthSelected = 12;
      this.yearSelected--;
    } else {
      this.monthSelected--;
    }

    this.createCalendarWeeks();
  }

  next() {
    if (this.monthSelected === 12) {
      this.monthSelected = 1;
      this.yearSelected++;
    } else {
      this.monthSelected++;
    }

    this.createCalendarWeeks();
  }

  confirmDay(day: Day) {
    this.onSelect.emit(day.toDate());
  }

  selectDay(day: Day) {
    if (!this.isValidDay(day)) {
      return;
    }

    this.daySelected = day;
    setTimeout(() => {
      this.confirmDay(day);
    }, 200);
  }

  showMonthView() {
    this.showView = 'month'; ``
  }

  hasYearSelection() {
    if (!this.toDate || !this.fromDate) {
      return true;
    }

    return this.toDate.getFullYear() !== this.fromDate.getFullYear();
  }

  showYearView() {
    this.showView = 'year';
    let startYear = this.yearSelected - 10;
    if (startYear % 10 !== 0) {
      startYear = startYear - (startYear % 10);
    }
    const endYear = startYear + 19;

    this.startYear = startYear;
    this.endYear = endYear;

    this.generateYears();
  }

  generateYears() {
    if (this.fromDate && this.startYear < this.fromDate.getFullYear()) {
      this.startYear = this.fromDate.getFullYear();
    }

    if (this.toDate && this.endYear > this.toDate.getFullYear()) {
      this.endYear = this.toDate.getFullYear();
    }
    
    this.years = [];
    for (let i = this.startYear; i <= this.endYear; i++) {
      this.years.push(i);
    }
  }

  showPreviousYears() {
    this.endYear = this.startYear - 1;
    this.startYear = this.endYear - 19;
    this.generateYears();
  }

  showNextYears() {
    this.startYear = this.endYear + 1;
    this.endYear = this.startYear + 19;
    this.generateYears();
  }

  hasPreviousYears() {
    if (!this.fromDate) {
      return true;
    }

    return this.startYear > this.fromDate.getFullYear();
  }

  hasNextYears() {
    if (!this.toDate) {
      return true;
    }

    return this.endYear < this.toDate.getFullYear();
  }

  selectMonth(month: number) {
    if (!this.isValidMonth(month-1)) {
      return;
    }

    this.monthSelected = month;
    this.createCalendarWeeks();
    setTimeout(() => {
      this.showView = 'calendar';
    }, 200);
  }

  selectYear(year) {
    this.yearSelected = year;
    this.createCalendarWeeks();
    setTimeout(() => {
      this.showView = 'calendar';
    }, 200);
  }

  resetView() {
    this.showView = 'calendar';
  }

  isToday(day) {
    return this.yearSelected === this.currentYear && this.monthSelected === this.currentMonth && this.currentDay === day;
  }

  generateCalendarWeeks(forDay: Day): Array<any> {
    const weeks: Array<any> = [];
    const month = Calendar.months<string, any>(1, forDay);
    const numOfWeeks = month.days.length / 7;

    let dayIndex = 0;
    for (let week = 0; week < numOfWeeks; week++) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        days.push(month.days[dayIndex]);
        dayIndex++;
      }
      weeks.push(days);
    }
    return weeks;
  }

  isValidDay(day: Day) {
    if (!this.toDate && !this.fromDate) {
      return true;
    }

    if (this.toDate && this.fromDate) {
      return day.toDate() >= this.fromDate && day.toDate() <= this.toDate;
    }

    if (this.toDate) {
      return day.toDate() <= this.toDate;
    }

    if (this.fromDate) {
      return day.toDate() >= this.fromDate;
    }
  }

  isValidMonth(index: number) {
    if (this.toDate && this.toDate.getFullYear() !== this.yearSelected && this.fromDate && this.fromDate.getFullYear() !== this.yearSelected) {
      return true;
    }

    if (!this.toDate && !this.fromDate) {
      return true;
    }

    if (this.fromDate && !this.toDate) {
      return new Date(this.yearSelected, index, 1) >= this.fromDate;  
    }

    if (this.toDate && !this.fromDate) {
      return new Date(this.yearSelected, index, 1) <= this.toDate;
    }
    
    return new Date(this.yearSelected, index, 1) >= this.fromDate &&
           new Date(this.yearSelected, index, 1) <= this.toDate;
  }

  //Styles

  getDayStyle(day: Day) {
    let style = {};
    if (this.isToday(day.dayOfMonth)) {
      style = this.todaysItemStyle;
    }

    if (this.daySelected && day.dayIdentifier === this.daySelected.dayIdentifier) {
      style = {...style, ...this.itemSelectedStyle};
    }

    return style;
  }

  getMonthStyle(index) {
    let style = {};
    style = {...style, ...this.monthLabelsStyle};
    if (index === this.currentMonth - 1) {
      style = {...style, ...this.todaysItemStyle};
    }

    if (index === this.monthSelected - 1) {
      style = {...style, ...this.itemSelectedStyle};
    }

    return style;
  }

  getYearStyle(year) {
    let style = {};
    style = {...style, ...this.yearLabelsStyle};
    if (year === this.currentYear) {
      style = {...style, ...this.todaysItemStyle};
    }

    if (year === this.yearSelected) {
      style = {...style, ...this.itemSelectedStyle};
    }

    return style;
  }
  //End of styles

}
