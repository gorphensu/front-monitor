SET NAMES utf8mb4;
SET foreign_key_checks = 0;


alter table `t_r_page_engine_ctrl_1_202012` modify column `app_version` varchar(20) not null default '' comment '所属版本';
alter table `t_r_page_engine_ctrl_1_202011` modify column `app_version` varchar(20) not null default '' comment '所属版本';
alter table `t_r_page_engine_ctrl_1_202010` modify column `app_version` varchar(20) not null default '' comment '所属版本';
alter table `t_r_page_engine_ctrl_1_202009` modify column `app_version` varchar(20) not null default '' comment '所属版本';
alter table `t_r_page_engine_ctrl_1_202008` modify column `app_version` varchar(20) not null default '' comment '所属版本';
alter table `t_r_page_engine_ctrl_1_202007` modify column `app_version` varchar(20) not null default '' comment '所属版本';

alter table `t_r_page_engine_ctrl_1_202012` modify column `count_type` varchar(20) not null default '' comment '统计尺度';
alter table `t_r_page_engine_ctrl_1_202011` modify column `count_type` varchar(20) not null default '' comment '统计尺度';
alter table `t_r_page_engine_ctrl_1_202010` modify column `count_type` varchar(20) not null default '' comment '统计尺度';
alter table `t_r_page_engine_ctrl_1_202009` modify column `count_type` varchar(20) not null default '' comment '统计尺度';
alter table `t_r_page_engine_ctrl_1_202008` modify column `count_type` varchar(20) not null default '' comment '统计尺度';
alter table `t_r_page_engine_ctrl_1_202007` modify column `count_type` varchar(20) not null default '' comment '统计尺度';

