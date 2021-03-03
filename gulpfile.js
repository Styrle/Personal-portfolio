var gulp = require('gulp');
var sass = require('gulp-sass');
var concatCss = require('gulp-concat-css');
var autoprefixer = require('gulp-autoprefixer');
var cleanCSS = require('gulp-clean-css');

sass.compiler = require('node-sass');

gulp.task('sass', function () {
    return gulp.src('./src/scss/**/*.scss')
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(concatCss("styles.css"))
        .pipe(cleanCSS({compatibility: 'ie8'}))
        .pipe(gulp.dest('./webroot/css'));
});

gulp.task('sass:watch', function () {
    gulp.watch('./src/scss/**/*.scss', gulp.series('sass'));
});
